from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "SHEKINA S-MART LUB"
    database_url: str = "sqlite:///./shekina.db"
    secret_key: str = "change-me-in-production-use-env-var"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    upload_dir: str = "uploads"
    max_login_attempts: int = 5
    lockout_minutes: int = 15
    # Producción (Render): orígenes separados por coma
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # Sembrar datos demo al arrancar si la BD está vacía
    seed_demo: bool = False
    # Servir frontend compilado desde backend/static (monolito Render)
    serve_static: bool = False
    static_dir: str = "static"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        return origins or ["http://localhost:5173"]

    class Config:
        env_file = ".env"


settings = Settings()
