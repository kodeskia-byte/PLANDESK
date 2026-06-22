from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.audit_log import AuditLog
from app.models.lubrication_record import LubricationRecord
from app.models.sync_log import SyncLog
from app.models.user import User, UserRole
from app.routers.areas import _user_area_ids
from app.schemas.executive import AuditLogOut, RecordTraceability

router = APIRouter(prefix="/audit", tags=["audit"])


def _log_to_out(log: AuditLog, db: Session) -> AuditLogOut:
    user_nombre = None
    if log.user_id:
        u = db.query(User).filter(User.id == log.user_id).first()
        if u:
            user_nombre = f"{u.nombre} {u.apellido}"
    return AuditLogOut(
        id=log.id,
        user_nombre=user_nombre,
        accion=log.accion,
        modulo=log.modulo,
        registro_id=log.registro_id,
        detalle=log.detalle,
        created_at=log.created_at.isoformat(),
    )


@router.get("/logs", response_model=list[AuditLogOut])
def list_audit_logs(
    modulo: str | None = None,
    registro_id: int | None = None,
    limit: int = Query(50, le=200),
    user: User = Depends(require_roles(UserRole.ito, UserRole.admin, UserRole.supervisor)),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if modulo:
        query = query.filter(AuditLog.modulo == modulo)
    if registro_id:
        query = query.filter(AuditLog.registro_id == registro_id)
    return [_log_to_out(l, db) for l in query.limit(limit).all()]


@router.get("/record/{record_id}", response_model=RecordTraceability)
def record_traceability(
    record_id: int,
    user: User = Depends(require_roles(UserRole.ito, UserRole.admin, UserRole.supervisor)),
    db: Session = Depends(get_db),
):
    record = db.query(LubricationRecord).filter(LubricationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    area_ids = _user_area_ids(user)
    if area_ids is not None and record.area_id not in area_ids:
        raise HTTPException(status_code=403, detail="Sin acceso")

    eventos: list[AuditLogOut] = []
    mecanico = db.query(User).filter(User.id == record.user_id).first()
    nombre_mecanico = f"{mecanico.nombre} {mecanico.apellido}" if mecanico else "Mecánico"

    audit_logs = (
        db.query(AuditLog)
        .filter(AuditLog.registro_id == record_id)
        .order_by(AuditLog.created_at.asc())
        .all()
    )
    eventos.extend(_log_to_out(l, db) for l in audit_logs)

    if record.created_at:
        eventos.insert(
            0,
            AuditLogOut(
                id=0,
                user_nombre=nombre_mecanico,
                accion="registro_creado",
                modulo="lubrication",
                registro_id=record_id,
                detalle=f"OT {record.ot} — {record.cantidad} {record.unidad}",
                created_at=record.created_at.isoformat(),
            ),
        )

    if record.synced_at:
        eventos.append(
            AuditLogOut(
                id=0,
                user_nombre=nombre_mecanico,
                accion="sincronizado",
                modulo="sync",
                registro_id=record_id,
                detalle="Registro sincronizado al servidor",
                created_at=record.synced_at.isoformat(),
            )
        )

    sync_logs = (
        db.query(SyncLog)
        .filter(SyncLog.record_id == record_id)
        .order_by(SyncLog.created_at.asc())
        .all()
    )
    for sl in sync_logs:
        u = db.query(User).filter(User.id == sl.user_id).first()
        eventos.append(
            AuditLogOut(
                id=sl.id,
                user_nombre=f"{u.nombre} {u.apellido}" if u else None,
                accion=sl.tipo_evento,
                modulo="sync",
                registro_id=record_id,
                detalle=sl.mensaje,
                created_at=sl.created_at.isoformat(),
            )
        )

    if record.fecha_validacion and record.supervisor_id:
        sup = db.query(User).filter(User.id == record.supervisor_id).first()
        eventos.append(
            AuditLogOut(
                id=0,
                user_nombre=f"{sup.nombre} {sup.apellido}" if sup else "Supervisor",
                accion=record.estado_validacion.value,
                modulo="validacion",
                registro_id=record_id,
                detalle=record.comentario_supervisor,
                created_at=record.fecha_validacion.isoformat(),
            )
        )

    eventos.sort(key=lambda e: e.created_at)

    return RecordTraceability(record_id=record_id, ot=record.ot, eventos=eventos)
