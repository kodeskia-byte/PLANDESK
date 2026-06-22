import os
import uuid

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.lubricant import Lubricant, LubricantStatus
from app.models.user import User, UserRole
from app.schemas.admin import LubricantCreate, LubricantUpdate
from app.schemas.common import LubricantOut
from app.utils.audit import log_audit

router = APIRouter(prefix="/lubricants", tags=["lubricants"])


def _lubricant_to_out(l: Lubricant) -> LubricantOut:
    return LubricantOut(
        id=l.id,
        nombre=l.nombre,
        codigo=l.codigo,
        descripcion=l.descripcion,
        unidad_default=l.unidad_default,
        foto_url=l.foto_url,
        estado=l.estado.value,
    )


@router.get("", response_model=list[LubricantOut])
def list_lubricants(
    include_inactive: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Lubricant)
    if not include_inactive or user.rol not in (UserRole.ito, UserRole.admin):
        query = query.filter(Lubricant.estado == LubricantStatus.activo)
    return [_lubricant_to_out(l) for l in query.order_by(Lubricant.nombre).all()]


@router.post("", response_model=LubricantOut, status_code=201)
def create_lubricant(
    body: LubricantCreate,
    user: User = Depends(require_roles(UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    codigo = body.codigo.strip().upper()
    if db.query(Lubricant).filter(Lubricant.codigo == codigo).first():
        raise HTTPException(status_code=400, detail="Código de lubricante ya existe")

    lubricant = Lubricant(
        nombre=body.nombre.strip(),
        codigo=codigo,
        descripcion=body.descripcion,
        unidad_default=body.unidad_default.strip(),
    )
    db.add(lubricant)
    log_audit(db, user.id, "lubricante_creado", "admin", detalle=f"Lubricante {codigo} creado")
    db.commit()
    db.refresh(lubricant)
    return _lubricant_to_out(lubricant)


@router.put("/{lubricant_id}", response_model=LubricantOut)
def update_lubricant(
    lubricant_id: int,
    body: LubricantUpdate,
    user: User = Depends(require_roles(UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    lubricant = db.query(Lubricant).filter(Lubricant.id == lubricant_id).first()
    if not lubricant:
        raise HTTPException(status_code=404, detail="Lubricante no encontrado")

    if body.nombre is not None:
        lubricant.nombre = body.nombre.strip()
    if body.codigo is not None:
        codigo = body.codigo.strip().upper()
        existing = db.query(Lubricant).filter(Lubricant.codigo == codigo, Lubricant.id != lubricant_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Código de lubricante ya existe")
        lubricant.codigo = codigo
    if body.descripcion is not None:
        lubricant.descripcion = body.descripcion
    if body.unidad_default is not None:
        lubricant.unidad_default = body.unidad_default.strip()
    if body.estado is not None:
        try:
            lubricant.estado = LubricantStatus(body.estado)
        except ValueError:
            raise HTTPException(status_code=400, detail="Estado inválido")

    log_audit(db, user.id, "lubricante_actualizado", "admin", detalle=f"Lubricante {lubricant.codigo} actualizado")
    db.commit()
    db.refresh(lubricant)
    return _lubricant_to_out(lubricant)


@router.post("/{lubricant_id}/photo")
async def upload_lubricant_photo(
    lubricant_id: int,
    file: UploadFile,
    user: User = Depends(require_roles(UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    lubricant = db.query(Lubricant).filter(Lubricant.id == lubricant_id).first()
    if not lubricant:
        raise HTTPException(status_code=404, detail="Lubricante no encontrado")

    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"lubricant_{lubricant_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(settings.upload_dir, filename)

    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)

    lubricant.foto_url = f"/uploads/{filename}"
    log_audit(
        db,
        user.id,
        "lubricante_foto",
        "admin",
        detalle=f"Foto actualizada lubricante {lubricant.codigo}",
    )
    db.commit()
    return {"foto_url": lubricant.foto_url}
