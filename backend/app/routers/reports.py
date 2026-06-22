from datetime import date
from io import BytesIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.area import Area
from app.models.lubrication_record import LubricationRecord
from app.models.machine import Machine
from app.models.user import User, UserRole
from app.routers.areas import _user_area_ids
from app.utils.report_builder import build_executive_pdf, build_preview_meta, record_to_row

router = APIRouter(prefix="/reports", tags=["reports"])

ESTADO_LABELS = {
    "validado": "Validado",
    "pendiente": "Pendiente",
    "rechazado": "Rechazado",
    "correccion_solicitada": "Corrección solicitada",
}


def _filtered_records(
    db: Session,
    user: User,
    area_id: int | None,
    machine_id: int | None,
    fecha_inicio: date | None,
    fecha_fin: date | None,
) -> list[LubricationRecord]:
    query = db.query(LubricationRecord).options(
        joinedload(LubricationRecord.area),
        joinedload(LubricationRecord.machine),
        joinedload(LubricationRecord.user),
        joinedload(LubricationRecord.supervisor),
        joinedload(LubricationRecord.lubricant),
    )
    area_ids = _user_area_ids(user)
    if area_ids is not None:
        query = query.filter(LubricationRecord.area_id.in_(area_ids))
    if area_id:
        query = query.filter(LubricationRecord.area_id == area_id)
    if machine_id:
        query = query.filter(LubricationRecord.machine_id == machine_id)
    if fecha_inicio:
        query = query.filter(LubricationRecord.fecha_registro >= fecha_inicio)
    if fecha_fin:
        query = query.filter(LubricationRecord.fecha_registro <= fecha_fin)
    return query.order_by(LubricationRecord.fecha_registro.desc()).all()


def _filter_labels(
    db: Session,
    area_id: int | None,
    machine_id: int | None,
) -> tuple[str | None, str | None]:
    area_nombre = None
    machine_nombre = None
    if area_id:
        area = db.query(Area).filter(Area.id == area_id).first()
        area_nombre = area.nombre if area else f"Área #{area_id}"
    if machine_id:
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
        machine_nombre = f"{machine.nombre} ({machine.tag})" if machine else f"Máquina #{machine_id}"
    return area_nombre, machine_nombre


@router.get("/preview")
def report_preview(
    area_id: int | None = None,
    machine_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    user: User = Depends(require_roles(UserRole.supervisor, UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    records = _filtered_records(db, user, area_id, machine_id, fecha_inicio, fecha_fin)
    area_nombre, machine_nombre = _filter_labels(db, area_id, machine_id)
    return build_preview_meta(
        user,
        records,
        area_id,
        machine_id,
        fecha_inicio,
        fecha_fin,
        area_nombre,
        machine_nombre,
    )


@router.get("/area")
def report_by_area(
    area_id: int = Query(...),
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    user: User = Depends(require_roles(UserRole.supervisor, UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    records = _filtered_records(db, user, area_id, None, fecha_inicio, fecha_fin)
    return [record_to_row(r) for r in records]


@router.get("/machine")
def report_by_machine(
    machine_id: int = Query(...),
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    user: User = Depends(require_roles(UserRole.supervisor, UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    records = _filtered_records(db, user, None, machine_id, fecha_inicio, fecha_fin)
    return [record_to_row(r) for r in records]


@router.get("/export/excel")
def export_excel(
    area_id: int | None = None,
    machine_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    user: User = Depends(require_roles(UserRole.supervisor, UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    records = _filtered_records(db, user, area_id, machine_id, fecha_inicio, fecha_fin)

    wb = Workbook()
    ws = wb.active
    ws.title = "Reporte Ejecutivo"
    ws.append(
        [
            "ID",
            "Fecha",
            "Hora",
            "Área",
            "Máquina",
            "TAG",
            "OT",
            "Lubricante",
            "Código",
            "Cantidad",
            "Unidad",
            "Mecánico",
            "Supervisor",
            "Fecha validación",
            "Estado",
            "Observaciones",
            "Comentario supervisor",
            "Foto Antes",
            "Foto Durante",
            "Foto Después",
            "Evidencia completa",
        ]
    )
    for r in records:
        row = record_to_row(r)
        ws.append(
            [
                row["id"],
                row["fecha"],
                row["hora"],
                row["area"],
                row["maquina"],
                row["machine_tag"],
                row["ot"],
                row["lubricante"],
                row["lubricante_codigo"],
                row["cantidad"],
                row["unidad"],
                row["responsable"],
                row["supervisor"] or "",
                row["fecha_validacion"] or "",
                ESTADO_LABELS.get(row["estado"], row["estado"]),
                row["observaciones"] or "",
                row["comentario_supervisor"] or "",
                row["evidencia_antes_url"] or "",
                row["evidencia_durante_url"] or "",
                row["evidencia_despues_url"] or "",
                "Sí" if row["evidencia_completa"] else "No",
            ]
        )

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=reporte_ejecutivo_lubricaciones.xlsx"},
    )


@router.get("/export/pdf")
def export_pdf(
    area_id: int | None = None,
    machine_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    user: User = Depends(require_roles(UserRole.supervisor, UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    records = _filtered_records(db, user, area_id, machine_id, fecha_inicio, fecha_fin)
    area_nombre, machine_nombre = _filter_labels(db, area_id, machine_id)
    pdf_bytes = build_executive_pdf(
        records,
        user,
        fecha_inicio,
        fecha_fin,
        area_nombre or "Todas las áreas",
        machine_nombre or "Todas las máquinas",
    )

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=reporte_ejecutivo_lubricaciones.pdf"},
    )
