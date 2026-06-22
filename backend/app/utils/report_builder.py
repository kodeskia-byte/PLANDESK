import os
from datetime import date, datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.config import settings
from app.models.lubrication_record import LubricationRecord
from app.models.user import User
from app.utils.evidence import evidence_complete, evidence_count, evidence_from_record

BRAND_BLUE = colors.HexColor("#004A99")
BRAND_ORANGE = colors.HexColor("#F39200")
BRAND_GREEN = colors.HexColor("#4CAF50")
DARK = colors.HexColor("#0f172a")
SLATE = colors.HexColor("#64748b")

ESTADO_LABELS = {
    "validado": "Validado",
    "pendiente": "Pendiente",
    "rechazado": "Rechazado",
    "correccion_solicitada": "Corrección solicitada",
}


def record_to_row(r: LubricationRecord) -> dict:
    supervisor_nombre = None
    if r.supervisor:
        supervisor_nombre = f"{r.supervisor.nombre} {r.supervisor.apellido}"
    antes, durante, despues = evidence_from_record(r)
    count = evidence_count(antes, durante, despues)
    return {
        "id": r.id,
        "fecha": str(r.fecha_registro),
        "hora": str(r.hora_registro)[:5] if r.hora_registro else "",
        "area": r.area.nombre if r.area else "",
        "area_id": r.area_id,
        "maquina": r.machine.nombre if r.machine else "",
        "machine_tag": r.machine.tag if r.machine else "",
        "machine_foto_url": r.machine.foto_url if r.machine else None,
        "ot": r.ot,
        "lubricante": r.lubricant.nombre if r.lubricant else "",
        "lubricante_codigo": r.lubricant.codigo if r.lubricant else "",
        "cantidad": r.cantidad,
        "unidad": r.unidad,
        "responsable": f"{r.user.nombre} {r.user.apellido}" if r.user else "",
        "supervisor": supervisor_nombre,
        "fecha_validacion": r.fecha_validacion.isoformat() if r.fecha_validacion else None,
        "observaciones": r.observaciones,
        "evidencia_url": durante or r.evidencia_url,
        "evidencia_antes_url": antes,
        "evidencia_durante_url": durante,
        "evidencia_despues_url": despues,
        "comentario_supervisor": r.comentario_supervisor,
        "estado": r.estado_validacion.value,
        "tiene_evidencia": count > 0,
        "evidencia_completa": evidence_complete(antes, durante, despues),
        "evidencias_count": count,
    }


def build_preview_meta(
    user: User,
    records: list[LubricationRecord],
    area_id: int | None,
    machine_id: int | None,
    fecha_inicio: date | None,
    fecha_fin: date | None,
    area_nombre: str | None = None,
    machine_nombre: str | None = None,
) -> dict:
    rows = [record_to_row(r) for r in records]
    consumo = sum(r.cantidad for r in records)
    con_evidencia = sum(
        1 for r in records if evidence_count(*evidence_from_record(r)) > 0
    )
    evidencia_completa = sum(
        1 for r in records if evidence_complete(*evidence_from_record(r))
    )

    resumen_areas: dict[str, dict] = {}
    for row in rows:
        area = row["area"] or "Sin área"
        if area not in resumen_areas:
            resumen_areas[area] = {"area": area, "total": 0, "validados": 0, "consumo": 0.0}
        resumen_areas[area]["total"] += 1
        if row["estado"] == "validado":
            resumen_areas[area]["validados"] += 1
        resumen_areas[area]["consumo"] += row["cantidad"]

    return {
        "meta": {
            "titulo": "Reporte Ejecutivo de Lubricación",
            "subtitulo": "SHEKINA S-MART LUB — Trazabilidad industrial",
            "generado_en": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            "generado_por": f"{user.nombre} {user.apellido}",
            "rol": user.rol.value,
            "filtros": {
                "area": area_nombre or "Todas las áreas",
                "maquina": machine_nombre or "Todas las máquinas",
                "fecha_inicio": str(fecha_inicio) if fecha_inicio else None,
                "fecha_fin": str(fecha_fin) if fecha_fin else None,
            },
        },
        "total": len(rows),
        "validados": sum(1 for x in rows if x["estado"] == "validado"),
        "pendientes": sum(1 for x in rows if x["estado"] == "pendiente"),
        "rechazados": sum(1 for x in rows if x["estado"] == "rechazado"),
        "correcciones": sum(1 for x in rows if x["estado"] == "correccion_solicitada"),
        "consumo_total": round(consumo, 2),
        "con_evidencia": con_evidencia,
        "evidencia_completa": evidencia_completa,
        "porcentaje_evidencia": round((con_evidencia / len(rows) * 100) if rows else 0, 1),
        "porcentaje_evidencia_completa": round((evidencia_completa / len(rows) * 100) if rows else 0, 1),
        "resumen_areas": sorted(resumen_areas.values(), key=lambda x: x["total"], reverse=True),
        "rows": rows,
    }


def _evidence_path(url: str | None) -> str | None:
    if not url:
        return None
    filename = url.split("/")[-1]
    path = os.path.join(settings.upload_dir, filename)
    return path if os.path.isfile(path) else None


def build_executive_pdf(
    records: list[LubricationRecord],
    user: User,
    fecha_inicio: date | None,
    fecha_fin: date | None,
    area_label: str,
    machine_label: str,
) -> bytes:
    from io import BytesIO

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ExecTitle",
        parent=styles["Title"],
        fontSize=18,
        textColor=BRAND_BLUE,
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "ExecSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=SLATE,
        spaceAfter=12,
    )
    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontSize=12,
        textColor=BRAND_BLUE,
        spaceBefore=14,
        spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=DARK,
    )
    small_style = ParagraphStyle(
        "Small",
        parent=styles["Normal"],
        fontSize=8,
        textColor=SLATE,
    )

    elements: list = []

    # Portada ejecutiva
    header_data = [
        [Paragraph("<b>SHEKINA S-MART LUB</b>", ParagraphStyle("H", fontSize=11, textColor=colors.white))],
        [Paragraph("<b>REPORTE EJECUTIVO DE LUBRICACIÓN</b>", ParagraphStyle("H2", fontSize=14, textColor=colors.white))],
        [Paragraph(
            f"Generado: {datetime.utcnow().strftime('%d/%m/%Y %H:%M')} · {user.nombre} {user.apellido}",
            ParagraphStyle("H3", fontSize=9, textColor=colors.HexColor("#cbd5e1")),
        )],
    ]
    header_table = Table(header_data, colWidths=[7 * inch])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_BLUE),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("TOPPADDING", (0, 0), (0, 0), 14),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 14),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 14))

    # Filtros aplicados
    filtros = [
        ["Área", area_label],
        ["Máquina", machine_label],
        ["Desde", str(fecha_inicio) if fecha_inicio else "—"],
        ["Hasta", str(fecha_fin) if fecha_fin else "—"],
    ]
    ft = Table(filtros, colWidths=[1.2 * inch, 5.8 * inch])
    ft.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(ft)
    elements.append(Spacer(1, 12))

    # KPIs
    validados = sum(1 for r in records if r.estado_validacion.value == "validado")
    con_ev = sum(1 for r in records if evidence_count(*evidence_from_record(r)) > 0)
    con_ev_completa = sum(1 for r in records if evidence_complete(*evidence_from_record(r)))
    consumo = sum(r.cantidad for r in records)
    kpi_data = [
        ["Total registros", str(len(records)), "Validados", str(validados)],
        ["Con evidencia", str(con_ev), "Evidencia 3 fotos", str(con_ev_completa)],
        ["Consumo total", f"{consumo:.1f}", "", ""],
    ]
    kpi_table = Table(kpi_data, colWidths=[1.5 * inch, 1.5 * inch, 1.5 * inch, 1.5 * inch])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (1, 0), (1, -1), BRAND_BLUE),
        ("TEXTCOLOR", (3, 0), (3, -1), BRAND_GREEN),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    elements.append(kpi_table)
    elements.append(Spacer(1, 16))

    elements.append(Paragraph("Detalle de registros", section_style))

    # Detalle por registro
    for i, r in enumerate(records, 1):
        estado = ESTADO_LABELS.get(r.estado_validacion.value, r.estado_validacion.value)
        mecanico = f"{r.user.nombre} {r.user.apellido}" if r.user else "—"
        supervisor = (
            f"{r.supervisor.nombre} {r.supervisor.apellido}" if r.supervisor else "—"
        )
        hora = str(r.hora_registro)[:5] if r.hora_registro else "—"

        elements.append(Paragraph(
            f"<b>#{i} · OT {r.ot}</b> — {estado}",
            ParagraphStyle("RecTitle", fontSize=10, textColor=BRAND_BLUE, spaceBefore=8, spaceAfter=4),
        ))

        detail = [
            ["Fecha / Hora", f"{r.fecha_registro} {hora}", "Área", r.area.nombre if r.area else "—"],
            ["Máquina", r.machine.nombre if r.machine else "—", "TAG", r.machine.tag if r.machine else "—"],
            ["Lubricante", r.lubricant.nombre if r.lubricant else "—", "Cantidad", f"{r.cantidad} {r.unidad}"],
            ["Mecánico", mecanico, "Supervisor", supervisor],
        ]
        dt = Table(detail, colWidths=[1.1 * inch, 2.4 * inch, 1.1 * inch, 2.4 * inch])
        dt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
            ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f1f5f9")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(dt)

        if r.observaciones:
            elements.append(Spacer(1, 4))
            elements.append(Paragraph(f"<b>Observaciones:</b> {r.observaciones}", body_style))
        if r.comentario_supervisor:
            elements.append(Paragraph(f"<b>Supervisor:</b> {r.comentario_supervisor}", small_style))

        antes, durante, despues = evidence_from_record(r)
        evidence_items = [
            ("Antes", antes),
            ("Durante", durante),
            ("Después", despues),
        ]
        if any(url for _, url in evidence_items):
            elements.append(Spacer(1, 6))
            elements.append(Paragraph("<b>Evidencia fotográfica (Antes · Durante · Después)</b>", small_style))
            img_cells = []
            label_cells = []
            for label, url in evidence_items:
                path = _evidence_path(url)
                label_cells.append(Paragraph(f"<b>{label}</b>", small_style))
                if path:
                    try:
                        img_cells.append(Image(path, width=2.1 * inch, height=1.4 * inch, kind="proportional"))
                    except Exception:
                        img_cells.append(Paragraph("(N/D)", small_style))
                else:
                    img_cells.append(Paragraph("(Sin foto)", small_style))
            img_table = Table([label_cells, img_cells], colWidths=[2.3 * inch, 2.3 * inch, 2.3 * inch])
            img_table.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            ]))
            elements.append(img_table)

        elements.append(Spacer(1, 8))
        if i < len(records):
            elements.append(Table([[""]], colWidths=[7 * inch], style=TableStyle([
                ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ])))

    elements.append(Spacer(1, 20))
    elements.append(Paragraph(
        "Documento generado por SHEKINA S-MART LUB — Uso interno Arauco/Codex",
        ParagraphStyle("Footer", fontSize=7, textColor=SLATE, alignment=TA_CENTER),
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
