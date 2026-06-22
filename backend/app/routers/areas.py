from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.area import Area, AreaStatus
from app.models.lubrication_record import LubricationRecord, ValidationStatus
from app.models.machine import Machine
from app.models.user import User, UserRole
from app.schemas.admin import AreaCreate, AreaUpdate
from app.schemas.common import AreaOut
from app.utils.audit import log_audit

router = APIRouter(prefix="/areas", tags=["areas"])


def _user_area_ids(user: User) -> list[int] | None:
    if user.rol in (UserRole.ito, UserRole.admin):
        return None
    return [ua.area_id for ua in user.areas]


def _area_to_out(area: Area, db: Session) -> AreaOut:
    machine_count = db.query(Machine).filter(Machine.area_id == area.id).count()
    pending = (
        db.query(LubricationRecord)
        .filter(
            LubricationRecord.area_id == area.id,
            LubricationRecord.estado_validacion == ValidationStatus.pendiente,
        )
        .count()
    )
    return AreaOut(
        id=area.id,
        nombre=area.nombre,
        descripcion=area.descripcion,
        estado=area.estado.value,
        machine_count=machine_count,
        pending_validations=pending,
    )


@router.get("", response_model=list[AreaOut])
def list_areas(
    include_inactive: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Area)
    if not include_inactive or user.rol not in (UserRole.ito, UserRole.admin):
        query = query.filter(Area.estado == AreaStatus.activa)
    area_ids = _user_area_ids(user)
    if area_ids is not None:
        query = query.filter(Area.id.in_(area_ids))

    return [_area_to_out(area, db) for area in query.order_by(Area.nombre).all()]


@router.get("/{area_id}", response_model=AreaOut)
def get_area(
    area_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    area = db.query(Area).filter(Area.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Área no encontrada")

    area_ids = _user_area_ids(user)
    if area_ids is not None and area_id not in area_ids:
        raise HTTPException(status_code=403, detail="Sin acceso a esta área")

    return _area_to_out(area, db)


@router.post("", response_model=AreaOut, status_code=201)
def create_area(
    body: AreaCreate,
    user: User = Depends(require_roles(UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    if db.query(Area).filter(Area.nombre == body.nombre.strip()).first():
        raise HTTPException(status_code=400, detail="Ya existe un área con ese nombre")

    area = Area(nombre=body.nombre.strip(), descripcion=body.descripcion)
    db.add(area)
    log_audit(db, user.id, "area_creada", "admin", detalle=f"Área {area.nombre} creada")
    db.commit()
    db.refresh(area)
    return _area_to_out(area, db)


@router.put("/{area_id}", response_model=AreaOut)
def update_area(
    area_id: int,
    body: AreaUpdate,
    user: User = Depends(require_roles(UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    area = db.query(Area).filter(Area.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Área no encontrada")

    if body.nombre is not None:
        nombre = body.nombre.strip()
        existing = db.query(Area).filter(Area.nombre == nombre, Area.id != area_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe un área con ese nombre")
        area.nombre = nombre
    if body.descripcion is not None:
        area.descripcion = body.descripcion
    if body.estado is not None:
        try:
            area.estado = AreaStatus(body.estado)
        except ValueError:
            raise HTTPException(status_code=400, detail="Estado inválido")

    log_audit(db, user.id, "area_actualizada", "admin", detalle=f"Área {area.nombre} actualizada")
    db.commit()
    db.refresh(area)
    return _area_to_out(area, db)
