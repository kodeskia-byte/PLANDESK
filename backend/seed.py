"""Seed inicial de datos demo para SHEKINA S-MART LUB."""

from app.database import Base, SessionLocal, engine
from demo_data import install_demo

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def seed():
    install_demo(db, force=False)


if __name__ == "__main__":
    seed()
    db.close()
