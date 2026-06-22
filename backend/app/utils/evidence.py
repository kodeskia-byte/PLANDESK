from app.models.lubrication_record import LubricationRecord
from app.schemas.lubrication import LubricationRecordCreate


def resolve_evidence_urls(body: LubricationRecordCreate) -> tuple[str | None, str | None, str | None, str | None]:
    """Retorna (antes, durante, despues, evidencia_url legacy)."""
    durante = body.evidencia_durante_url or body.evidencia_url
    antes = body.evidencia_antes_url
    despues = body.evidencia_despues_url
    legacy = durante or body.evidencia_url
    return antes, durante, despues, legacy


def evidence_from_record(record: LubricationRecord) -> tuple[str | None, str | None, str | None]:
    durante = record.evidencia_durante_url or record.evidencia_url
    return record.evidencia_antes_url, durante, record.evidencia_despues_url


def evidence_count(antes: str | None, durante: str | None, despues: str | None) -> int:
    return sum(1 for url in (antes, durante, despues) if url)


def evidence_complete(antes: str | None, durante: str | None, despues: str | None) -> bool:
    return bool(antes and durante and despues)
