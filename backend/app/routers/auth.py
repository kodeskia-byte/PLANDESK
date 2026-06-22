from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.audit_log import AuditLog
from app.models.user import User, UserStatus
from app.schemas.auth import LoginRequest, TokenResponse
from app.utils.rut import clean_rut, format_rut, validate_rut
from app.utils.security import create_access_token, verify_pin

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    if not validate_rut(body.rut):
        raise HTTPException(status_code=400, detail="RUT inválido")

    rut = format_rut(body.rut)
    user = db.query(User).filter(User.rut == rut).first()

    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if user.estado == UserStatus.bloqueado:
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise HTTPException(status_code=403, detail="Usuario bloqueado temporalmente")
        user.estado = UserStatus.activo
        user.login_attempts = 0
        user.locked_until = None

    if not verify_pin(body.pin, user.pin_hash):
        user.login_attempts += 1
        if user.login_attempts >= settings.max_login_attempts:
            user.estado = UserStatus.bloqueado
            user.locked_until = datetime.utcnow() + timedelta(minutes=settings.lockout_minutes)
        db.commit()
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    user.login_attempts = 0
    user.last_login = datetime.utcnow()
    db.add(
        AuditLog(
            user_id=user.id,
            accion="login",
            modulo="auth",
            ip=request.client.host if request.client else None,
        )
    )
    db.commit()

    area_ids = [ua.area_id for ua in user.areas]
    token = create_access_token({"sub": str(user.id), "rol": user.rol.value})

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        rut=user.rut,
        nombre=user.nombre,
        apellido=user.apellido,
        rol=user.rol,
        area_ids=area_ids,
    )


@router.post("/logout")
def logout(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.add(
        AuditLog(
            user_id=user.id,
            accion="logout",
            modulo="auth",
            ip=request.client.host if request.client else None,
        )
    )
    db.commit()
    return {"message": "Sesión cerrada"}
