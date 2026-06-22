from pydantic import BaseModel, Field

from app.models.user import UserRole


class LoginRequest(BaseModel):
    rut: str = Field(..., min_length=8, max_length=12)
    pin: str = Field(..., min_length=4, max_length=20)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    rut: str
    nombre: str
    apellido: str
    rol: UserRole
    area_ids: list[int]
