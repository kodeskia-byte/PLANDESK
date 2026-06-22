from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.area import Area
from app.models.lubrication_record import LubricationRecord
from app.models.machine import Machine, MachineStatus
from app.models.user import User, UserRole
from app.routers.areas import _user_area_ids
from app.models.lubricant import Lubricant
from app.schemas.admin import MachineCreate, MachineUpdate
from app.schemas.common import MachineOut
from app.utils.audit import log_audit
import os
import uuid
import aiofiles

router = APIRouter(prefix="/machines", tags=["machines"])


def _machine_to_out(machine: Machine, db: Session) -> MachineOut:
    last_record = (
        db.query(LubricationRecord)
        .filter(LubricationRecord.machine_id == machine.id)
        .order_by(LubricationRecord.fecha_registro.desc())
        .first()
    )
    last_date = None
    dias_desde = None
    cumplimiento = None

    if last_record:
        last_date = datetime.combine(last_record.fecha_registro, last_record.hora_registro)
        dias_desde = (date.today() - last_record.fecha_registro).days
        if machine.frecuencia_dias:
            ratio = dias_desde / machine.frecuencia_dias
            if ratio >= 1:
                cumplimiento = "atrasado"
            elif ratio >= 0.75:
                cumplimiento = "proximo"
            else:
                cumplimiento = "al_dia"
    elif machine.frecuencia_dias:
        cumplimiento = "sin_registro"

    lub_nombre = None
    if machine.lubricante_recomendado:
        lub_nombre = machine.lubricante_recomendado.nombre

    area_nombre = machine.area.nombre if machine.area else None

    return MachineOut(
        id=machine.id,
        area_id=machine.area_id,
        nombre=machine.nombre,
        tag=machine.tag,
        codigo_interno=machine.codigo_interno,
        descripcion=machine.descripcion,
        foto_url=machine.foto_url,
        tipo_maquina=machine.tipo_maquina,
        lubricante_recomendado_id=machine.lubricante_recomendado_id,
        lubricante_recomendado_nombre=lub_nombre,
        area_nombre=area_nombre,
        frecuencia_dias=machine.frecuencia_dias,
        estado=machine.estado.value,
        last_lubrication_date=last_date,
        dias_desde_ultima=dias_desde,
        cumplimiento=cumplimiento,
    )


@router.get("", response_model=list[MachineOut])
def list_machines(
    area_id: int | None = None,
    include_inactive: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Machine)
    if not include_inactive or user.rol not in (UserRole.ito, UserRole.admin):
        query = query.filter(Machine.estado == MachineStatus.activa)
    area_ids = _user_area_ids(user)
    if area_id:
        if area_ids is not None and area_id not in area_ids:
            raise HTTPException(status_code=403, detail="Sin acceso a esta área")
        query = query.filter(Machine.area_id == area_id)
    elif area_ids is not None:
        query = query.filter(Machine.area_id.in_(area_ids))

    return [_machine_to_out(m, db) for m in query.order_by(Machine.nombre).all()]


@router.post("", response_model=MachineOut, status_code=201)
def create_machine(
    body: MachineCreate,
    user: User = Depends(require_roles(UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    area = db.query(Area).filter(Area.id == body.area_id).first()
    if not area:
        raise HTTPException(status_code=400, detail="Área no encontrada")

    if body.lubricante_recomendado_id:
        lub = db.query(Lubricant).filter(Lubricant.id == body.lubricante_recomendado_id).first()
        if not lub:
            raise HTTPException(status_code=400, detail="Lubricante no encontrado")

    try:
        estado = MachineStatus(body.estado)
    except ValueError:
        raise HTTPException(status_code=400, detail="Estado inválido")

    machine = Machine(
        area_id=body.area_id,
        nombre=body.nombre.strip(),
        tag=body.tag.strip().upper(),
        codigo_interno=body.codigo_interno,
        descripcion=body.descripcion,
        tipo_maquina=body.tipo_maquina,
        lubricante_recomendado_id=body.lubricante_recomendado_id,
        frecuencia_dias=body.frecuencia_dias,
        estado=estado,
    )
    db.add(machine)
    log_audit(db, user.id, "maquina_creada", "admin", detalle=f"Máquina {machine.tag} creada")
    db.commit()
    db.refresh(machine)
    return _machine_to_out(machine, db)


@router.get("/{machine_id}", response_model=MachineOut)
def get_machine(
    machine_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")

    area_ids = _user_area_ids(user)
    if area_ids is not None and machine.area_id not in area_ids:
        raise HTTPException(status_code=403, detail="Sin acceso a esta máquina")

    return _machine_to_out(machine, db)


@router.get("/area/{area_id}/machines", response_model=list[MachineOut])
def machines_by_area(
    area_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    area_ids = _user_area_ids(user)
    if area_ids is not None and area_id not in area_ids:
        raise HTTPException(status_code=403, detail="Sin acceso a esta área")

    machines = db.query(Machine).filter(Machine.area_id == area_id).all()
    return [_machine_to_out(m, db) for m in machines]


@router.post("/{machine_id}/photo")
async def upload_machine_photo(
    machine_id: int,
    file: UploadFile,
    user: User = Depends(require_roles(UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")

    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"machine_{machine_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(settings.upload_dir, filename)

    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)

    machine.foto_url = f"/uploads/{filename}"
    log_audit(db, user.id, "maquina_foto", "admin", detalle=f"Foto actualizada máquina {machine.tag}")
    db.commit()
    return {"foto_url": machine.foto_url}


@router.put("/{machine_id}", response_model=MachineOut)
def update_machine(
    machine_id: int,
    body: MachineUpdate,
    user: User = Depends(require_roles(UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")

    if body.area_id is not None:
        area = db.query(Area).filter(Area.id == body.area_id).first()
        if not area:
            raise HTTPException(status_code=400, detail="Área no encontrada")
        machine.area_id = body.area_id
    if body.nombre is not None:
        machine.nombre = body.nombre.strip()
    if body.tag is not None:
        machine.tag = body.tag.strip().upper()
    if body.codigo_interno is not None:
        machine.codigo_interno = body.codigo_interno
    if body.descripcion is not None:
        machine.descripcion = body.descripcion
    if body.tipo_maquina is not None:
        machine.tipo_maquina = body.tipo_maquina
    if body.lubricante_recomendado_id is not None:
        if body.lubricante_recomendado_id:
            lub = db.query(Lubricant).filter(Lubricant.id == body.lubricante_recomendado_id).first()
            if not lub:
                raise HTTPException(status_code=400, detail="Lubricante no encontrado")
        machine.lubricante_recomendado_id = body.lubricante_recomendado_id
    if body.frecuencia_dias is not None:
        machine.frecuencia_dias = body.frecuencia_dias
    if body.estado is not None:
        try:
            machine.estado = MachineStatus(body.estado)
        except ValueError:
            raise HTTPException(status_code=400, detail="Estado inválido")

    log_audit(db, user.id, "maquina_actualizada", "admin", detalle=f"Máquina {machine.tag} actualizada")
    db.commit()
    db.refresh(machine)
    return _machine_to_out(machine, db)
