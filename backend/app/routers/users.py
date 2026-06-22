from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.models.area import Area
from app.models.user import User, UserArea, UserRole, UserStatus
from app.routers.areas import _user_area_ids
from app.schemas.admin import PinResetRequest, UserCreate, UserUpdate
from app.schemas.common import UserOut
from app.utils.audit import log_audit
from app.utils.rut import format_rut, validate_rut
from app.utils.security import hash_pin

router = APIRouter(prefix="/users", tags=["users"])

ADMIN_ROLES = (UserRole.ito, UserRole.admin)


def _user_to_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        rut=user.rut,
        nombre=user.nombre,
        apellido=user.apellido,
        rol=user.rol.value,
        estado=user.estado.value,
        area_ids=[ua.area_id for ua in user.areas],
    )


def _assign_areas(db: Session, user: User, area_ids: list[int]) -> None:
    db.query(UserArea).filter(UserArea.user_id == user.id).delete()
    for area_id in area_ids:
        area = db.query(Area).filter(Area.id == area_id).first()
        if not area:
            raise HTTPException(status_code=400, detail=f"Área {area_id} no existe")
        db.add(UserArea(user_id=user.id, area_id=area_id))


def _parse_role(rol: str) -> UserRole:
    try:
        return UserRole(rol)
    except ValueError:
        raise HTTPException(status_code=400, detail="Rol inválido")


def _parse_status(estado: str) -> UserStatus:
    try:
        return UserStatus(estado)
    except ValueError:
        raise HTTPException(status_code=400, detail="Estado inválido")


@router.get("", response_model=list[UserOut])
def list_users(
    user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.apellido, User.nombre).all()
    return [_user_to_out(u) for u in users]


@router.get("/mecanicos", response_model=list[UserOut])
def list_mecanicos(
    user: User = Depends(require_roles(UserRole.supervisor, UserRole.ito, UserRole.admin)),
    db: Session = Depends(get_db),
):
    area_ids = _user_area_ids(user)
    query = (
        db.query(User)
        .filter(User.rol == UserRole.mecanico, User.estado == UserStatus.activo)
    )

    if area_ids is not None:
        query = query.join(UserArea).filter(UserArea.area_id.in_(area_ids))

    return [_user_to_out(m) for m in query.distinct().all()]


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return _user_to_out(target)


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    body: UserCreate,
    user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    if not validate_rut(body.rut):
        raise HTTPException(status_code=400, detail="RUT inválido")

    rut = format_rut(body.rut)
    if db.query(User).filter(User.rut == rut).first():
        raise HTTPException(status_code=400, detail="RUT ya registrado")

    new_user = User(
        rut=rut,
        nombre=body.nombre.strip(),
        apellido=body.apellido.strip(),
        pin_hash=hash_pin(body.pin),
        rol=_parse_role(body.rol),
        estado=UserStatus.activo,
    )
    db.add(new_user)
    db.flush()

    if body.area_ids:
        _assign_areas(db, new_user, body.area_ids)

    log_audit(db, user.id, "usuario_creado", "admin", detalle=f"Usuario {rut} creado")
    db.commit()
    db.refresh(new_user)
    return _user_to_out(new_user)


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if body.nombre is not None:
        target.nombre = body.nombre.strip()
    if body.apellido is not None:
        target.apellido = body.apellido.strip()
    if body.rol is not None:
        target.rol = _parse_role(body.rol)
    if body.estado is not None:
        if user_id == user.id and body.estado != UserStatus.activo.value:
            raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta")
        target.estado = _parse_status(body.estado)
        if target.estado == UserStatus.activo:
            target.login_attempts = 0
            target.locked_until = None
    if body.area_ids is not None:
        _assign_areas(db, target, body.area_ids)

    log_audit(db, user.id, "usuario_actualizado", "admin", detalle=f"Usuario {target.rut} actualizado")
    db.commit()
    db.refresh(target)
    return _user_to_out(target)


@router.post("/{user_id}/reset-pin")
def reset_pin(
    user_id: int,
    body: PinResetRequest,
    user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    target.pin_hash = hash_pin(body.pin)
    target.login_attempts = 0
    target.locked_until = None
    if target.estado == UserStatus.bloqueado:
        target.estado = UserStatus.activo

    log_audit(db, user.id, "pin_reset", "admin", detalle=f"PIN reiniciado para {target.rut}")
    db.commit()
    return {"message": "PIN actualizado correctamente"}

