from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_audit(
    db: Session,
    user_id: int | None,
    accion: str,
    modulo: str,
    registro_id: int | None = None,
    detalle: str | None = None,
    ip: str | None = None,
) -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            accion=accion,
            modulo=modulo,
            registro_id=registro_id,
            detalle=detalle,
            ip=ip,
        )
    )
