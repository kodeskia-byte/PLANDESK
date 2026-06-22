from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.area import Area
from app.models.lubrication_record import LubricationRecord, SyncStatus, ValidationStatus
from app.models.machine import Machine
from app.models.user import User, UserRole
from app.routers.areas import _user_area_ids
from app.schemas.executive import (
    AreaKPIs,
    ExecutiveKPIs,
    MachineAlert,
    MachineKPIItem,
    MachineKPIs,
    RankingItem,
    TrendPoint,
)
from app.schemas.lubrication import KPIsGeneral, SupervisorDailyKPIs

router = APIRouter(prefix="/kpis", tags=["kpis"])


def _records_query(db: Session, user: User, area_id: int | None = None):
    query = db.query(LubricationRecord)
    area_ids = _user_area_ids(user)
    if area_ids is not None:
        query = query.filter(LubricationRecord.area_id.in_(area_ids))
    if area_id:
        query = query.filter(LubricationRecord.area_id == area_id)
    return query


def _machine_compliance(machine: Machine, db: Session) -> tuple[str | None, int | None]:
    last = (
        db.query(LubricationRecord)
        .filter(LubricationRecord.machine_id == machine.id)
        .order_by(LubricationRecord.fecha_registro.desc())
        .first()
    )
    if not last:
        return "sin_registro", None
    dias = (date.today() - last.fecha_registro).days
    if not machine.frecuencia_dias:
        return "al_dia", dias
    ratio = dias / machine.frecuencia_dias
    if ratio >= 1:
        return "atrasado", dias
    if ratio >= 0.75:
        return "proximo", dias
    return "al_dia", dias


@router.get("/general", response_model=KPIsGeneral)
def general_kpis(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    records = _records_query(db, user).all()
    total = len(records)

    total_por_area: dict[str, int] = {}
    total_por_maquina: dict[str, int] = {}
    consumo_total = 0.0
    consumo_por_lubricante: dict[str, float] = {}

    for r in records:
        area_name = r.area.nombre if r.area else str(r.area_id)
        machine_name = r.machine.nombre if r.machine else str(r.machine_id)
        lub_name = r.lubricant.nombre if r.lubricant else str(r.lubricant_id)

        total_por_area[area_name] = total_por_area.get(area_name, 0) + 1
        total_por_maquina[machine_name] = total_por_maquina.get(machine_name, 0) + 1
        consumo_total += r.cantidad
        consumo_por_lubricante[lub_name] = consumo_por_lubricante.get(lub_name, 0) + r.cantidad

    pendientes_validacion = sum(1 for r in records if r.estado_validacion == ValidationStatus.pendiente)
    validados = sum(1 for r in records if r.estado_validacion == ValidationStatus.validado)
    rechazados = sum(1 for r in records if r.estado_validacion == ValidationStatus.rechazado)
    pendientes_sync = sum(1 for r in records if r.estado_sincronizacion != SyncStatus.sincronizado)

    cutoff = date.today() - timedelta(days=30)
    machines_without = []
    area_ids = _user_area_ids(user)
    machine_query = db.query(Machine)
    if area_ids is not None:
        machine_query = machine_query.filter(Machine.area_id.in_(area_ids))

    for machine in machine_query.all():
        last = (
            db.query(LubricationRecord)
            .filter(LubricationRecord.machine_id == machine.id)
            .order_by(LubricationRecord.fecha_registro.desc())
            .first()
        )
        if not last or last.fecha_registro < cutoff:
            machines_without.append(machine.nombre)

    return KPIsGeneral(
        total_lubricaciones=total,
        total_por_area=total_por_area,
        total_por_maquina=total_por_maquina,
        pendientes_validacion=pendientes_validacion,
        validados=validados,
        rechazados=rechazados,
        consumo_total=round(consumo_total, 2),
        consumo_por_lubricante=consumo_por_lubricante,
        maquinas_sin_lubricacion_reciente=machines_without,
        pendientes_sincronizacion=pendientes_sync,
    )


@router.get("/supervisor/daily", response_model=SupervisorDailyKPIs)
def supervisor_daily_kpis(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    records = _records_query(db, user).all()
    registros_hoy = sum(1 for r in records if r.fecha_registro == today)
    pendientes = sum(1 for r in records if r.estado_validacion == ValidationStatus.pendiente)
    correcciones = sum(1 for r in records if r.estado_validacion == ValidationStatus.correccion_solicitada)

    validados_hoy = rechazados_hoy = 0
    por_area: dict[str, int] = {}

    for r in records:
        if r.fecha_registro == today:
            name = r.area.nombre if r.area else str(r.area_id)
            por_area[name] = por_area.get(name, 0) + 1
        if r.fecha_validacion and r.fecha_validacion.date() == today:
            if r.estado_validacion == ValidationStatus.validado:
                validados_hoy += 1
            elif r.estado_validacion == ValidationStatus.rechazado:
                rechazados_hoy += 1

    return SupervisorDailyKPIs(
        registros_hoy=registros_hoy,
        pendientes_validacion=pendientes,
        validados_hoy=validados_hoy,
        rechazados_hoy=rechazados_hoy,
        correcciones_pendientes=correcciones,
        registros_por_area_hoy=por_area,
    )


@router.get("/executive", response_model=ExecutiveKPIs)
def executive_kpis(
    user: User = Depends(require_roles(UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    records = _records_query(db, user).all()
    area_ids = _user_area_ids(user)
    machine_query = db.query(Machine)
    if area_ids is not None:
        machine_query = machine_query.filter(Machine.area_id.in_(area_ids))
    machines = machine_query.all()

    al_dia = 0
    alertas: list[MachineAlert] = []
    for m in machines:
        cumpl, dias = _machine_compliance(m, db)
        if cumpl == "al_dia":
            al_dia += 1
        if cumpl in ("atrasado", "sin_registro", "proximo"):
            alertas.append(
                MachineAlert(
                    machine_id=m.id,
                    nombre=m.nombre,
                    area=m.area.nombre if m.area else "",
                    dias_sin_lubricacion=dias,
                    cumplimiento=cumpl or "sin_registro",
                )
            )

    total_m = len(machines) or 1
    cumplimiento = round((al_dia / total_m) * 100, 1)

    # Tendencia semanal (8 semanas)
    tendencia_semanal: list[TrendPoint] = []
    for i in range(7, -1, -1):
        start = date.today() - timedelta(weeks=i + 1)
        end = date.today() - timedelta(weeks=i)
        count = sum(1 for r in records if start <= r.fecha_registro < end)
        tendencia_semanal.append(TrendPoint(periodo=f"S-{8 - i}", valor=count))

    # Tendencia mensual (6 meses)
    tendencia_mensual: list[TrendPoint] = []
    today = date.today()
    for i in range(5, -1, -1):
        month = today.month - i
        year = today.year
        while month <= 0:
            month += 12
            year -= 1
        count = sum(1 for r in records if r.fecha_registro.month == month and r.fecha_registro.year == year)
        tendencia_mensual.append(TrendPoint(periodo=f"{month:02d}/{year}", valor=count))

    area_counts: dict[str, int] = defaultdict(int)
    area_consumo: dict[str, float] = defaultdict(float)
    mecanico_counts: dict[str, int] = defaultdict(int)

    for r in records:
        an = r.area.nombre if r.area else "?"
        area_counts[an] += 1
        area_consumo[an] += r.cantidad
        if r.user:
            mn = f"{r.user.nombre} {r.user.apellido}"
            mecanico_counts[mn] += 1

    ranking_areas = sorted(
        [RankingItem(nombre=k, valor=v, extra=f"{area_consumo[k]:.0f} consumo") for k, v in area_counts.items()],
        key=lambda x: x.valor,
        reverse=True,
    )[:10]

    ranking_mecanicos = sorted(
        [RankingItem(nombre=k, valor=v) for k, v in mecanico_counts.items()],
        key=lambda x: x.valor,
        reverse=True,
    )[:10]

    avg_consumo = sum(area_consumo.values()) / max(len(area_consumo), 1)
    areas_elevado = [k for k, v in area_consumo.items() if v > avg_consumo * 1.5]

    return ExecutiveKPIs(
        cumplimiento_general=cumplimiento,
        total_maquinas=len(machines),
        maquinas_al_dia=al_dia,
        tendencia_semanal=tendencia_semanal,
        tendencia_mensual=tendencia_mensual,
        ranking_areas=ranking_areas,
        ranking_mecanicos=ranking_mecanicos,
        consumo_por_area=dict(area_consumo),
        alertas_maquinas=sorted(alertas, key=lambda a: a.dias_sin_lubricacion or 999, reverse=True)[:15],
        areas_consumo_elevado=areas_elevado,
    )


@router.get("/area/{area_id}", response_model=AreaKPIs)
def area_kpis(
    area_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    area_ids = _user_area_ids(user)
    if area_ids is not None and area_id not in area_ids:
        raise HTTPException(status_code=403, detail="Sin acceso")

    area = db.query(Area).filter(Area.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Área no encontrada")

    records = _records_query(db, user, area_id).all()
    machines = db.query(Machine).filter(Machine.area_id == area_id).all()

    machine_items: list[MachineKPIItem] = []
    for m in machines:
        m_records = [r for r in records if r.machine_id == m.id]
        cumpl, _ = _machine_compliance(m, db)
        last = max((r.fecha_registro for r in m_records), default=None)
        machine_items.append(
            MachineKPIItem(
                machine_id=m.id,
                nombre=m.nombre,
                tag=m.tag,
                total_lubricaciones=len(m_records),
                consumo_total=round(sum(r.cantidad for r in m_records), 2),
                ultima_fecha=str(last) if last else None,
                cumplimiento=cumpl,
            )
        )

    return AreaKPIs(
        area_id=area_id,
        area_nombre=area.nombre,
        total_lubricaciones=len(records),
        consumo_total=round(sum(r.cantidad for r in records), 2),
        pendientes_validacion=sum(1 for r in records if r.estado_validacion == ValidationStatus.pendiente),
        validados=sum(1 for r in records if r.estado_validacion == ValidationStatus.validado),
        rechazados=sum(1 for r in records if r.estado_validacion == ValidationStatus.rechazado),
        maquinas=sorted(machine_items, key=lambda x: x.total_lubricaciones, reverse=True),
    )


@router.get("/machine/{machine_id}", response_model=MachineKPIs)
def machine_kpis(
    machine_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")

    area_ids = _user_area_ids(user)
    if area_ids is not None and machine.area_id not in area_ids:
        raise HTTPException(status_code=403, detail="Sin acceso")

    records = _records_query(db, user).filter(LubricationRecord.machine_id == machine_id).all()
    cumpl, dias = _machine_compliance(machine, db)

    return MachineKPIs(
        machine_id=machine_id,
        machine_nombre=machine.nombre,
        area_nombre=machine.area.nombre if machine.area else "",
        total_lubricaciones=len(records),
        consumo_total=round(sum(r.cantidad for r in records), 2),
        pendientes_validacion=sum(1 for r in records if r.estado_validacion == ValidationStatus.pendiente),
        validados=sum(1 for r in records if r.estado_validacion == ValidationStatus.validado),
        frecuencia_dias=machine.frecuencia_dias,
        dias_desde_ultima=dias,
        cumplimiento=cumpl,
    )
