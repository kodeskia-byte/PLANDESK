from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def run_migrations(engine: Engine) -> None:
    """Migraciones ligeras para SQLite / PostgreSQL sin Alembic."""
    inspector = inspect(engine)

    with engine.begin() as conn:
        if inspector.has_table("lubrication_records"):
            columns = {col["name"] for col in inspector.get_columns("lubrication_records")}
            new_cols = [
                ("evidencia_antes_url", "VARCHAR(500)"),
                ("evidencia_durante_url", "VARCHAR(500)"),
                ("evidencia_despues_url", "VARCHAR(500)"),
            ]
            for name, col_type in new_cols:
                if name not in columns:
                    conn.execute(text(f"ALTER TABLE lubrication_records ADD COLUMN {name} {col_type}"))

            if "evidencia_url" in columns:
                conn.execute(
                    text(
                        """
                        UPDATE lubrication_records
                        SET evidencia_durante_url = evidencia_url
                        WHERE evidencia_durante_url IS NULL AND evidencia_url IS NOT NULL
                        """
                    )
                )

        if inspector.has_table("lubricants"):
            lub_columns = {col["name"] for col in inspector.get_columns("lubricants")}
            if "foto_url" not in lub_columns:
                conn.execute(text("ALTER TABLE lubricants ADD COLUMN foto_url VARCHAR(500)"))
