def clean_rut(rut: str) -> str:
    return rut.replace(".", "").replace("-", "").upper()


def validate_rut(rut: str) -> bool:
    cleaned = clean_rut(rut)
    if len(cleaned) < 2:
        return False

    body, dv = cleaned[:-1], cleaned[-1]
    if not body.isdigit():
        return False

    total = 0
    multiplier = 2
    for digit in reversed(body):
        total += int(digit) * multiplier
        multiplier = multiplier + 1 if multiplier < 7 else 2

    remainder = 11 - (total % 11)
    expected = "K" if remainder == 10 else ("0" if remainder == 11 else str(remainder))
    return dv == expected


def format_rut(rut: str) -> str:
    cleaned = clean_rut(rut)
    body, dv = cleaned[:-1], cleaned[-1]
    formatted = ""
    for i, char in enumerate(reversed(body)):
        if i > 0 and i % 3 == 0:
            formatted = "." + formatted
        formatted = char + formatted
    return f"{formatted}-{dv}"
