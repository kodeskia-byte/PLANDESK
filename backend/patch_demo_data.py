"""Compatibilidad: redirige al reseed demo completo."""

from app.database import SessionLocal
from demo_data import install_demo

if __name__ == "__main__":
    db = SessionLocal()
    install_demo(db, force=True)
    db.close()
