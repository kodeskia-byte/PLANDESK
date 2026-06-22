"""
Dataset demo completo para SHEKINA S-MART LUB.
Ejecutar: python reseed_demo.py  (reemplaza datos existentes)
Primera vez: python seed.py
"""

from datetime import date, datetime, time, timedelta

from sqlalchemy.orm import Session

from app.models.area import Area, AreaStatus
from app.models.audit_log import AuditLog
from app.models.lubricant import Lubricant, LubricantStatus
from app.models.lubrication_record import LubricationRecord, SyncStatus, ValidationStatus
from app.models.machine import Machine, MachineStatus
from app.models.sync_log import SyncLog
from app.models.user import User, UserArea, UserRole, UserStatus
from app.utils.security import hash_pin

# ── Áreas industriales (nombres descriptivos) ──────────────────────────────

AREAS = [
    (
        "Línea de Astillado",
        "Proceso de reducción de troncos — astilladoras, cintas y reductores de alimentación.",
    ),
    (
        "Planta de Secado",
        "Secadores rotativos, ventiladores de proceso y bombas de condensado.",
    ),
    (
        "Sala de Calderas",
        "Calderas recuperadoras, hornos de licor y sistemas de circulación.",
    ),
    (
        "Taller de Mantenimiento",
        "Taller central — compresores, grúas y equipos de apoyo.",
    ),
    (
        "Línea de Enrollado",
        "Prensas, enrolladoras y motores de línea de papel.",
    ),
]

LUBRICANTS = [
    ("Aceite Hidráulico ISO 68", "LUB-001", "Aceite hidráulico para bombas y cilindros", "ml"),
    ("Grasa EP-2 Litio", "LUB-002", "Grasa de extrema presión para rodamientos", "g"),
    ("Aceite Sintético PAO", "LUB-003", "Aceite sintético para alta temperatura", "ml"),
    ("Aceite Engranajes ISO 220", "LUB-004", "Lubricante para reductores y engranajes", "ml"),
]

# (rut, nombre, apellido, pin, rol, area_indices 1-based)
USERS = [
    ("22.222.222-2", "Juan", "Pérez", "1234", UserRole.mecanico, [1, 2]),
    ("55.555.555-5", "Pedro", "Soto", "1234", UserRole.mecanico, [3, 4, 5]),
    ("33.333.333-3", "María", "González", "1234", UserRole.supervisor, [1, 2, 3, 4, 5]),
    ("44.444.444-4", "Carlos", "Rodríguez", "1234", UserRole.ito, [1, 2, 3, 4, 5]),
    ("11.111.111-1", "Admin", "Sistema", "admin1", UserRole.admin, [1, 2, 3, 4, 5]),
]

# (area_idx, nombre, tag, codigo, lub_code, freq_dias, tipo, descripcion)
MACHINES = [
    (1, "Astilladora Principal AS-01", "TAG-AS01", "EQ-AST-001", "LUB-004", 14, "Astillado", "Astilladora de disco principal"),
    (1, "Cinta Alimentación CA-01", "TAG-CA01", "EQ-AST-002", "LUB-002", 7, "Transporte", "Cinta transportadora de troncos"),
    (1, "Reductor Alimentación RA-01", "TAG-RA01", "EQ-AST-003", "LUB-004", 30, "Transmisión", "Reductor de alimentación astilladora"),
    (2, "Secador Rotativo SR-01", "TAG-SR01", "EQ-SEC-001", "LUB-003", 14, "Secado", "Secador rotativo principal"),
    (2, "Ventilador Proceso VF-02", "TAG-VF02", "EQ-SEC-002", "LUB-002", 7, "Ventilación", "Ventilador de extracción de humos"),
    (2, "Bomba Condensado BC-01", "TAG-BC01", "EQ-SEC-003", "LUB-001", 7, "Bomba", "Bomba de recirculación de condensado"),
    (3, "Caldera Recuperadora CR-01", "TAG-CR01", "EQ-CAL-001", "LUB-003", 30, "Caldera", "Caldera recuperadora de licor negro"),
    (3, "Horno de Licor HL-02", "TAG-HL02", "EQ-CAL-002", "LUB-003", 21, "Horno", "Horno de combustión de licor"),
    (3, "Bomba Circulación BC-02", "TAG-BC02", "EQ-CAL-003", "LUB-001", 7, "Bomba", "Bomba de circulación de licor"),
    (4, "Compresor de Aire CP-01", "TAG-CP01", "EQ-MAN-001", "LUB-001", 14, "Compresor", "Compresor de aire industrial"),
    (4, "Grúa Puente GP-01", "TAG-GP01", "EQ-MAN-002", "LUB-002", 30, "Grúa", "Grúa puente taller central"),
    (4, "Torno Industrial TI-01", "TAG-TI01", "EQ-MAN-003", "LUB-004", 21, "Torno", "Torno para mantenimiento mecánico"),
    (5, "Prensa Principal PR-01", "TAG-PR01", "EQ-ENR-001", "LUB-004", 14, "Prensa", "Prensa de la línea de papel"),
    (5, "Enrolladora ER-01", "TAG-ER01", "EQ-ENR-002", "LUB-002", 7, "Enrollado", "Enrolladora final de bobinas"),
    (5, "Motor Línea ML-01", "TAG-ML01", "EQ-ENR-003", "LUB-003", 7, "Motor", "Motor principal de accionamiento"),
]

MACHINE_PHOTOS = [
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&q=80",
    "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=600&q=80",
    "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80",
    "https://images.unsplash.com/photo-1513828583688-c52646db42da?w=600&q=80",
    "https://images.unsplash.com/photo-1537467638028-5b30e0920c09?w=600&q=80",
    "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80",
]

EVIDENCE_PHOTOS = [
    "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80",
    "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80",
    "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80",
]


def _triple_evidence(idx: int, with_evidence: bool) -> tuple[str | None, str | None, str | None, str | None]:
    if not with_evidence:
        return None, None, None, None
    antes = EVIDENCE_PHOTOS[idx % len(EVIDENCE_PHOTOS)]
    durante = EVIDENCE_PHOTOS[(idx + 1) % len(EVIDENCE_PHOTOS)]
    despues = EVIDENCE_PHOTOS[(idx + 2) % len(EVIDENCE_PHOTOS)]
    return antes, durante, despues, durante


def clear_all_data(db: Session) -> None:
    db.query(AuditLog).delete()
    db.query(SyncLog).delete()
    db.query(LubricationRecord).delete()
    db.query(UserArea).delete()
    db.query(Machine).delete()
    db.query(User).delete()
    db.query(Area).delete()
    db.query(Lubricant).delete()
    db.commit()


# area_id (1-based index en AREAS) → mecánico responsable
MECANICO_BY_AREA = {
    1: "22.222.222-2",
    2: "22.222.222-2",
    3: "55.555.555-5",
    4: "55.555.555-5",
    5: "55.555.555-5",
}


def _pick_mecanico(users: dict[str, User], area_id: int) -> User:
    rut = MECANICO_BY_AREA.get(area_id, "22.222.222-2")
    return users[rut]


def _build_records(
    db: Session,
    machines: list[Machine],
    users: dict[str, User],
    lub_by_code: dict[str, int],
) -> list[LubricationRecord]:
    supervisor = users["33.333.333-3"]
    today = date.today()
    records: list[LubricationRecord] = []
    ot_counter = 1

    # (machine_tag, days_ago, estado, cantidad, observaciones, evidencia, comentario_sup)
    SCENARIOS = [
        ("TAG-AS01", 0, ValidationStatus.pendiente, 320, "Lubricación rutinaria astilladora — punto de goteo corregido", True, None),
        ("TAG-CA01", 0, ValidationStatus.pendiente, 180, "Grasa en rodamientos lado operación", True, None),
        ("TAG-SR01", 1, ValidationStatus.validado, 450, "Aceite sintético en cojinetes secador", True, "Registro conforme, evidencia clara"),
        ("TAG-VF02", 2, ValidationStatus.validado, 120, "Grasa EP-2 en motor ventilador", True, None),
        ("TAG-CR01", 3, ValidationStatus.validado, 500, "Lubricación programada caldera", False, "Sin evidencia pero cantidad correcta"),
        ("TAG-PR01", 0, ValidationStatus.pendiente, 280, "Prensa — lubricación turno mañana", True, None),
        ("TAG-ER01", 5, ValidationStatus.validado, 95, "Enrolladora — puntos de engrase", True, None),
        ("TAG-BC01", 7, ValidationStatus.validado, 200, "Bomba condensado — nivel OK", True, None),
        ("TAG-CP01", 10, ValidationStatus.validado, 350, "Compresor taller — cambio parcial aceite", True, None),
        ("TAG-ML01", 12, ValidationStatus.rechazado, 150, "Cantidad registrada parece baja", True, "Revisar volumen aplicado, repetir registro"),
        ("TAG-RA01", 14, ValidationStatus.correccion_solicitada, 400, "Foto borrosa, no se ve punto de lubricación", True, "Adjuntar foto más cercana del punto lubricado"),
        ("TAG-HL02", 18, ValidationStatus.validado, 380, "Horno licor — rutina quincenal", True, None),
        ("TAG-GP01", 21, ValidationStatus.validado, 220, "Grúa puente — poleas y cable", False, None),
        ("TAG-TI01", 25, ValidationStatus.validado, 160, "Torno — guías y husillo", True, None),
        ("TAG-BC02", 28, ValidationStatus.validado, 190, "Bomba circulación caldera", True, None),
        ("TAG-CA01", 35, ValidationStatus.validado, 175, "Mantenimiento preventivo cinta", True, None),
        ("TAG-AS01", 42, ValidationStatus.validado, 310, "Astilladora — lubricación mensual", True, None),
        ("TAG-SR01", 49, ValidationStatus.validado, 420, "Secador — cojinetes trasera", True, None),
        ("TAG-PR01", 21, ValidationStatus.validado, 265, "Prensa — rutina anterior", True, None),
        ("TAG-VF02", 0, ValidationStatus.pendiente, 110, "Ventilador — turno tarde", False, None),
        ("TAG-ER01", 6, ValidationStatus.correccion_solicitada, 88, "OT sin número de SAP visible en foto", True, "Incluir OT SAP en observaciones"),
        ("TAG-CP01", 4, ValidationStatus.validado, 340, "Compresor — filtro y aceite", True, None),
        ("TAG-ML01", 8, ValidationStatus.validado, 145, "Motor línea — rodamientos libres", True, None),
        ("TAG-RA01", 45, ValidationStatus.validado, 390, "Reductor — engranajes sin ruido", True, None),
        ("TAG-HL02", 0, ValidationStatus.pendiente, 370, "Horno — lubricación de emergencia solicitada", True, None),
    ]

    machine_by_tag = {m.tag: m for m in machines}

    for tag, days_ago, estado, cantidad, obs, evidencia, comentario in SCENARIOS:
        machine = machine_by_tag.get(tag)
        if not machine:
            continue
        mecanico = _pick_mecanico(users, machine.area_id)
        lub_id = machine.lubricante_recomendado_id or lub_by_code["LUB-001"]
        lub = db.query(Lubricant).filter(Lubricant.id == lub_id).first()
        unidad = lub.unidad_default if lub else "ml"
        reg_date = today - timedelta(days=days_ago)
        hora = time(8 + (ot_counter % 9), (ot_counter * 7) % 60)

        ev_antes, ev_durante, ev_despues, ev_legacy = _triple_evidence(ot_counter, evidencia)
        record = LubricationRecord(
            area_id=machine.area_id,
            machine_id=machine.id,
            user_id=mecanico.id,
            supervisor_id=supervisor.id if estado != ValidationStatus.pendiente else None,
            ot=f"OT-2026-{ot_counter:04d}",
            lubricant_id=lub_id,
            cantidad=float(cantidad),
            unidad=unidad,
            fecha_registro=reg_date,
            hora_registro=hora,
            observaciones=obs,
            evidencia_url=ev_legacy,
            evidencia_antes_url=ev_antes,
            evidencia_durante_url=ev_durante,
            evidencia_despues_url=ev_despues,
            estado_sincronizacion=SyncStatus.sincronizado,
            estado_validacion=estado,
            comentario_supervisor=comentario,
            fecha_validacion=(
                datetime.combine(reg_date, hora) + timedelta(hours=4)
                if estado != ValidationStatus.pendiente
                else None
            ),
            synced_at=datetime.utcnow(),
        )
        db.add(record)
        db.flush()
        records.append(record)
        ot_counter += 1

    # Registros históricos extra para tendencias KPI (últimas 8 semanas)
    trend_machines = [m for m in machines if m.tag in ("TAG-SR01", "TAG-PR01", "TAG-CR01", "TAG-CA01")]
    for week in range(1, 8):
        for i, machine in enumerate(trend_machines):
            mecanico = _pick_mecanico(users, machine.area_id)
            reg_date = today - timedelta(days=week * 7 + i)
            lub_id = machine.lubricante_recomendado_id or lub_by_code["LUB-001"]
            ev_antes, ev_durante, ev_despues, ev_legacy = _triple_evidence(week + i, True)
            record = LubricationRecord(
                area_id=machine.area_id,
                machine_id=machine.id,
                user_id=mecanico.id,
                supervisor_id=supervisor.id,
                ot=f"OT-HIST-{week:02d}{i:02d}",
                lubricant_id=lub_id,
                cantidad=200.0 + week * 15 + i * 10,
                unidad="ml",
                fecha_registro=reg_date,
                hora_registro=time(9, 30),
                observaciones=f"Registro histórico semana S-{8 - week}",
                evidencia_url=ev_legacy,
                evidencia_antes_url=ev_antes,
                evidencia_durante_url=ev_durante,
                evidencia_despues_url=ev_despues,
                estado_sincronizacion=SyncStatus.sincronizado,
                estado_validacion=ValidationStatus.validado,
                comentario_supervisor="Validado en revisión semanal",
                fecha_validacion=datetime.combine(reg_date, time(14, 0)),
                synced_at=datetime.utcnow(),
            )
            db.add(record)
            records.append(record)

    return records


def _seed_audit_logs(db: Session, records: list[LubricationRecord], users: dict[str, User]) -> None:
    supervisor = users["33.333.333-3"]
    for record in records:
        db.add(
            AuditLog(
                user_id=record.user_id,
                accion="registro_creado",
                modulo="lubricacion",
                registro_id=record.id,
                detalle=f"OT {record.ot} creada",
                created_at=datetime.combine(record.fecha_registro, record.hora_registro),
            )
        )
        if record.estado_validacion == ValidationStatus.validado:
            db.add(
                AuditLog(
                    user_id=supervisor.id,
                    accion="validado",
                    modulo="lubricacion",
                    registro_id=record.id,
                    detalle=f"OT {record.ot} validada",
                    created_at=record.fecha_validacion or datetime.utcnow(),
                )
            )
        elif record.estado_validacion == ValidationStatus.rechazado:
            db.add(
                AuditLog(
                    user_id=supervisor.id,
                    accion="rechazado",
                    modulo="lubricacion",
                    registro_id=record.id,
                    detalle=record.comentario_supervisor,
                    created_at=record.fecha_validacion or datetime.utcnow(),
                )
            )
        elif record.estado_validacion == ValidationStatus.correccion_solicitada:
            db.add(
                AuditLog(
                    user_id=supervisor.id,
                    accion="correccion_solicitada",
                    modulo="lubricacion",
                    registro_id=record.id,
                    detalle=record.comentario_supervisor,
                    created_at=record.fecha_validacion or datetime.utcnow(),
                )
            )


def install_demo(db: Session, force: bool = False) -> None:
    if db.query(User).count() > 0 and not force:
        print("La base ya tiene datos. Usa: python reseed_demo.py")
        return

    if force:
        clear_all_data(db)
        print("Datos anteriores eliminados.")

    lub_by_code: dict[str, int] = {}
    for nombre, codigo, desc, unidad in LUBRICANTS:
        lub = Lubricant(
            nombre=nombre,
            codigo=codigo,
            descripcion=desc,
            unidad_default=unidad,
            estado=LubricantStatus.activo,
        )
        db.add(lub)
        db.flush()
        lub_by_code[codigo] = lub.id

    area_ids: list[int] = []
    for nombre, desc in AREAS:
        area = Area(nombre=nombre, descripcion=desc, estado=AreaStatus.activa)
        db.add(area)
        db.flush()
        area_ids.append(area.id)

    users: dict[str, User] = {}
    for rut, nombre, apellido, pin, rol, area_indices in USERS:
        user = User(
            rut=rut,
            nombre=nombre,
            apellido=apellido,
            pin_hash=hash_pin(pin),
            rol=rol,
            estado=UserStatus.activo,
        )
        db.add(user)
        db.flush()
        for idx in area_indices:
            db.add(UserArea(user_id=user.id, area_id=area_ids[idx - 1]))
        db.flush()
        users[rut] = user

    machines: list[Machine] = []
    for i, (area_idx, nombre, tag, codigo, lub_code, freq, tipo, desc) in enumerate(MACHINES):
        machine = Machine(
            area_id=area_ids[area_idx - 1],
            nombre=nombre,
            tag=tag,
            codigo_interno=codigo,
            descripcion=desc,
            tipo_maquina=tipo,
            foto_url=MACHINE_PHOTOS[i % len(MACHINE_PHOTOS)],
            lubricante_recomendado_id=lub_by_code[lub_code],
            frecuencia_dias=freq,
            estado=MachineStatus.activa,
        )
        db.add(machine)
        db.flush()
        machines.append(machine)

    records = _build_records(db, machines, users, lub_by_code)
    _seed_audit_logs(db, records, users)

    db.commit()

    pendientes = sum(1 for r in records if r.estado_validacion == ValidationStatus.pendiente)
    validados = sum(1 for r in records if r.estado_validacion == ValidationStatus.validado)
    print(f"Demo instalada: {len(AREAS)} áreas, {len(machines)} máquinas, {len(records)} registros")
    print(f"  Validados: {validados} | Pendientes: {pendientes}")
    print()
    print("Credenciales demo:")
    print("  Mecanico 1 (Juan):   22.222.222-2 / 1234  - Linea Astillado, Secado")
    print("  Mecanico 2 (Pedro):  55.555.555-5 / 1234  - Calderas, Mantenimiento, Enrollado")
    print("  Supervisor (María):  33.333.333-3 / 1234")
    print("  ITO (Carlos):        44.444.444-4 / 1234")
    print("  Admin:               11.111.111-1 / admin1")
