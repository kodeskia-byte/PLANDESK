from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.lubrication_record import (
    LubricationRecord,
    SyncStatus,
    ValidationStatus,
)
from app.models.sync_log import SyncLog
from app.models.user import User, UserRole
from app.routers.areas import _user_area_ids
from app.utils.audit import log_audit
from app.utils.evidence import evidence_complete, evidence_from_record, resolve_evidence_urls
from app.schemas.lubrication import (
    LubricationRecordCorrection,
    LubricationRecordCreate,
    LubricationRecordOut,
    SyncBatchRequest,
    ValidationRequest,
)
import os
import uuid
import aiofiles

router = APIRouter(prefix="/lubrication-records", tags=["records"])


def _record_to_out(record: LubricationRecord) -> LubricationRecordOut:
    antes, durante, despues = evidence_from_record(record)
    return LubricationRecordOut(
        id=record.id,
        uuid_local=record.uuid_local,
        area_id=record.area_id,
        machine_id=record.machine_id,
        user_id=record.user_id,
        supervisor_id=record.supervisor_id,
        ot=record.ot,
        lubricant_id=record.lubricant_id,
        cantidad=record.cantidad,
        unidad=record.unidad,
        fecha_registro=record.fecha_registro,
        hora_registro=record.hora_registro,
        observaciones=record.observaciones,
        evidencia_url=durante or record.evidencia_url,
        evidencia_antes_url=antes,
        evidencia_durante_url=durante,
        evidencia_despues_url=despues,
        estado_sincronizacion=record.estado_sincronizacion.value,
        estado_validacion=record.estado_validacion.value,
        comentario_supervisor=record.comentario_supervisor,
        fecha_validacion=record.fecha_validacion,
        created_at=record.created_at,
        synced_at=record.synced_at,
        user_nombre=f"{record.user.nombre} {record.user.apellido}" if record.user else None,
        machine_nombre=record.machine.nombre if record.machine else None,
        area_nombre=record.area.nombre if record.area else None,
        lubricant_nombre=record.lubricant.nombre if record.lubricant else None,
        supervisor_nombre=(
            f"{record.supervisor.nombre} {record.supervisor.apellido}"
            if record.supervisor
            else None
        ),
        machine_foto_url=record.machine.foto_url if record.machine else None,
    )


@router.get("", response_model=list[LubricationRecordOut])
def list_records(
    area_id: int | None = None,
    machine_id: int | None = None,
    estado_validacion: str | None = None,
    user_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(LubricationRecord)
    area_ids = _user_area_ids(user)

    if user.rol == UserRole.mecanico:
        query = query.filter(LubricationRecord.user_id == user.id)
    elif area_ids is not None:
        query = query.filter(LubricationRecord.area_id.in_(area_ids))

    if area_id:
        query = query.filter(LubricationRecord.area_id == area_id)
    if machine_id:
        query = query.filter(LubricationRecord.machine_id == machine_id)
    if estado_validacion:
        query = query.filter(
            LubricationRecord.estado_validacion == ValidationStatus(estado_validacion)
        )
    if user_id:
        query = query.filter(LubricationRecord.user_id == user_id)
    if fecha_inicio:
        query = query.filter(LubricationRecord.fecha_registro >= fecha_inicio)
    if fecha_fin:
        query = query.filter(LubricationRecord.fecha_registro <= fecha_fin)

    records = query.order_by(LubricationRecord.created_at.desc()).limit(200).all()
    return [_record_to_out(r) for r in records]


@router.get("/{record_id}", response_model=LubricationRecordOut)
def get_record(
    record_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(LubricationRecord).filter(LubricationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    if user.rol == UserRole.mecanico and record.user_id != user.id:
        raise HTTPException(status_code=403, detail="Sin acceso a este registro")

    area_ids = _user_area_ids(user)
    if area_ids is not None and record.area_id not in area_ids:
        raise HTTPException(status_code=403, detail="Sin acceso a este registro")

    return _record_to_out(record)


@router.post("", response_model=LubricationRecordOut)
def create_record(
    request: Request,
    body: LubricationRecordCreate,
    user: User = Depends(require_roles(UserRole.mecanico, UserRole.admin)),
    db: Session = Depends(get_db),
):
    if body.uuid_local:
        existing = (
            db.query(LubricationRecord)
            .filter(LubricationRecord.uuid_local == body.uuid_local)
            .first()
        )
        if existing:
            return _record_to_out(existing)

    antes, durante, despues, legacy = resolve_evidence_urls(body)
    record = LubricationRecord(
        uuid_local=body.uuid_local or str(uuid.uuid4()),
        area_id=body.area_id,
        machine_id=body.machine_id,
        user_id=user.id,
        ot=body.ot,
        lubricant_id=body.lubricant_id,
        cantidad=body.cantidad,
        unidad=body.unidad,
        fecha_registro=body.fecha_registro,
        hora_registro=body.hora_registro,
        observaciones=body.observaciones,
        evidencia_url=legacy,
        evidencia_antes_url=antes,
        evidencia_durante_url=durante,
        evidencia_despues_url=despues,
        estado_sincronizacion=SyncStatus.sincronizado,
        estado_validacion=ValidationStatus.pendiente,
        synced_at=datetime.utcnow(),
    )
    db.add(record)
    db.flush()
    log_audit(
        db,
        user.id,
        "registro_creado",
        "lubrication",
        record.id,
        f"OT {record.ot}",
        request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(record)
    return _record_to_out(record)


@router.post("/sync", response_model=list[LubricationRecordOut])
def sync_records(
    body: SyncBatchRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = []
    for item in body.records:
        if item.uuid_local:
            existing = (
                db.query(LubricationRecord)
                .filter(LubricationRecord.uuid_local == item.uuid_local)
                .first()
            )
            if existing:
                results.append(_record_to_out(existing))
                continue

        antes, durante, despues, legacy = resolve_evidence_urls(item)
        record = LubricationRecord(
            uuid_local=item.uuid_local or str(uuid.uuid4()),
            area_id=item.area_id,
            machine_id=item.machine_id,
            user_id=user.id,
            ot=item.ot,
            lubricant_id=item.lubricant_id,
            cantidad=item.cantidad,
            unidad=item.unidad,
            fecha_registro=item.fecha_registro,
            hora_registro=item.hora_registro,
            observaciones=item.observaciones,
            evidencia_url=legacy,
            evidencia_antes_url=antes,
            evidencia_durante_url=durante,
            evidencia_despues_url=despues,
            estado_sincronizacion=SyncStatus.sincronizado,
            estado_validacion=ValidationStatus.pendiente,
            synced_at=datetime.utcnow(),
        )
        db.add(record)
        db.flush()
        db.add(
            SyncLog(
                user_id=user.id,
                record_id=record.id,
                tipo_evento="sync",
                estado="ok",
                mensaje="Sincronización exitosa",
            )
        )
        results.append(_record_to_out(record))

    db.commit()
    return results


@router.put("/{record_id}/correction", response_model=LubricationRecordOut)
def submit_correction(
    record_id: int,
    request: Request,
    body: LubricationRecordCorrection,
    user: User = Depends(require_roles(UserRole.mecanico, UserRole.admin)),
    db: Session = Depends(get_db),
):
    record = db.query(LubricationRecord).filter(LubricationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    if user.rol == UserRole.mecanico and record.user_id != user.id:
        raise HTTPException(status_code=403, detail="Sin acceso a este registro")

    if record.estado_validacion != ValidationStatus.correccion_solicitada:
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden corregir registros con corrección solicitada",
        )

    antes, durante, despues, legacy = resolve_evidence_urls(body)
    if not evidence_complete(antes, durante, despues):
        raise HTTPException(
            status_code=400,
            detail="Debe adjuntar las 3 fotos de evidencia: Antes, Durante y Después",
        )

    record.lubricant_id = body.lubricant_id
    record.cantidad = body.cantidad
    record.unidad = body.unidad
    record.observaciones = body.observaciones
    record.evidencia_url = legacy
    record.evidencia_antes_url = antes
    record.evidencia_durante_url = durante
    record.evidencia_despues_url = despues
    record.estado_validacion = ValidationStatus.pendiente
    record.estado_sincronizacion = SyncStatus.sincronizado
    record.synced_at = datetime.utcnow()

    log_audit(
        db,
        user.id,
        "correccion_enviada",
        "lubrication",
        record_id,
        f"Corrección OT {record.ot}",
        request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(record)
    return _record_to_out(record)


@router.post("/{record_id}/validate", response_model=LubricationRecordOut)
def validate_record(
    record_id: int,
    request: Request,
    body: ValidationRequest = ValidationRequest(),
    user: User = Depends(require_roles(UserRole.supervisor, UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    record = db.query(LubricationRecord).filter(LubricationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    record.estado_validacion = ValidationStatus.validado
    record.supervisor_id = user.id
    record.comentario_supervisor = body.comentario
    record.fecha_validacion = datetime.utcnow()
    log_audit(db, user.id, "validado", "validacion", record_id, body.comentario, request.client.host if request.client else None)
    db.commit()
    db.refresh(record)
    return _record_to_out(record)


@router.post("/{record_id}/reject", response_model=LubricationRecordOut)
def reject_record(
    record_id: int,
    request: Request,
    body: ValidationRequest,
    user: User = Depends(require_roles(UserRole.supervisor, UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    record = db.query(LubricationRecord).filter(LubricationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    record.estado_validacion = ValidationStatus.rechazado
    record.supervisor_id = user.id
    record.comentario_supervisor = body.comentario
    record.fecha_validacion = datetime.utcnow()
    log_audit(db, user.id, "rechazado", "validacion", record_id, body.comentario, request.client.host if request.client else None)
    db.commit()
    db.refresh(record)
    return _record_to_out(record)


@router.post("/{record_id}/request-correction", response_model=LubricationRecordOut)
def request_correction(
    record_id: int,
    request: Request,
    body: ValidationRequest,
    user: User = Depends(require_roles(UserRole.supervisor, UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    record = db.query(LubricationRecord).filter(LubricationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    if not body.comentario or not body.comentario.strip():
        raise HTTPException(status_code=400, detail="Debe indicar qué corregir")

    record.estado_validacion = ValidationStatus.correccion_solicitada
    record.supervisor_id = user.id
    record.comentario_supervisor = body.comentario
    record.fecha_validacion = datetime.utcnow()
    log_audit(db, user.id, "correccion_solicitada", "validacion", record_id, body.comentario, request.client.host if request.client else None)
    db.commit()
    db.refresh(record)
    return _record_to_out(record)


@router.post("/upload-evidence")
async def upload_evidence(
    file: UploadFile,
    user: User = Depends(get_current_user),
):
    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"evidence_{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(settings.upload_dir, filename)

    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)

    return {"evidencia_url": f"/uploads/{filename}"}
