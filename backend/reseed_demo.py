"""Reemplaza todos los datos con el dataset demo completo."""

from app.database import Base, SessionLocal, engine
from demo_data import install_demo

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if __name__ == "__main__":
    install_demo(db, force=True)
    db.close()
