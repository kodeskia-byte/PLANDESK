import logging
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.utils.migrate import run_migrations
from app.routers import areas, audit, auth, kpis, lubricants, machines, records, reports, users

logger = logging.getLogger(__name__)

os.makedirs(settings.upload_dir, exist_ok=True)

app = FastAPI(
    title=settings.app_name,
    description="Plataforma de control y trazabilidad de lubricación industrial",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(areas.router, prefix="/api")
app.include_router(machines.router, prefix="/api")
app.include_router(lubricants.router, prefix="/api")
app.include_router(records.router, prefix="/api")
app.include_router(kpis.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(audit.router, prefix="/api")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "serve_static": settings.serve_static,
        "database": "postgresql" if settings.database_url.startswith("postgresql") else "sqlite",
    }


def _seed_demo_if_needed() -> None:
    if not settings.seed_demo:
        return
    try:
        from demo_data import install_demo

        db = SessionLocal()
        try:
            install_demo(db, force=False)
            logger.info("Demo seed: verificado o instalado")
        finally:
            db.close()
    except Exception as exc:
        logger.exception("Error al sembrar datos demo: %s", exc)


def _mount_frontend() -> None:
    if not settings.serve_static:
        return

    static_root = Path(__file__).resolve().parent.parent / settings.static_dir
    if not static_root.is_dir():
        logger.warning("SERVE_STATIC=true pero no existe %s", static_root)
        return

    app.mount(
        "/",
        StaticFiles(directory=str(static_root), html=True),
        name="frontend",
    )
    logger.info("Frontend estático montado en / desde %s", static_root)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
    _seed_demo_if_needed()


_mount_frontend()
