"""Workbook generation and professional styling service for STRUCTRA document exports."""

import io
import math
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from app.services.document_metadata import CreatedDocumentMetadata
from app.services.export.data_mapper import map_document_to_export_data
from app.services.export.schemas import ExportDocumentData

# ─── STRUCTRA Brand Colors & Styling Tokens ──────────────────────────────────
FONT_FAMILY = "Segoe UI"

COLOR_ORANGE_PRIMARY = "EA580C"  # STRUCTRA Brand Warm Orange (Tailwind Orange 600)
COLOR_ORANGE_DARK    = "C2410C"  # Deep Orange (Orange 700)
COLOR_DARK_SLATE     = "0F172A"  # Primary Text & Headings (Slate 900)
COLOR_MUTED_SLATE    = "475569"  # Field Labels (Slate 600)
COLOR_LIGHT_MUTED    = "64748B"  # Subtitles & Captions (Slate 500)
COLOR_VERY_MUTED     = "94A3B8"  # Footers & Minor Notes (Slate 400)
COLOR_BORDER         = "CBD5E1"  # Table Borders (Slate 300)
COLOR_BORDER_LIGHT   = "E2E8F0"  # Cell Borders (Slate 200)
COLOR_BG_BANNER      = "F1F5F9"  # Section Banner Fill (Slate 100)
COLOR_BG_ORANGE      = "FFF7ED"  # Total & Highlight Fill (Orange 50)
COLOR_BG_ZEBRA       = "F8FAFC"  # Table Alternating Row Fill (Slate 50)
COLOR_SUCCESS_GREEN  = "15803D"  # Positive Verification (Green 700)
COLOR_WARNING_AMBER  = "B45309"  # Warning Flag (Amber 700)
COLOR_DANGER_RED     = "B91C1C"  # Discrepancy Flag (Red 700)
COLOR_WHITE          = "FFFFFF"

# ─── Typography Hierarchy ────────────────────────────────────────────────────
FONT_BRAND_TITLE     = Font(name=FONT_FAMILY, size=16, bold=True, color=COLOR_ORANGE_PRIMARY)
FONT_DOC_REPORT_TAG  = Font(name=FONT_FAMILY, size=10.5, bold=True, color=COLOR_DARK_SLATE)
FONT_BRAND_SUBTITLE  = Font(name=FONT_FAMILY, size=9, bold=True, color=COLOR_LIGHT_MUTED)
FONT_EXPORT_DATE     = Font(name=FONT_FAMILY, size=8.5, italic=True, color=COLOR_VERY_MUTED)

FONT_SECTION_HEADER  = Font(name=FONT_FAMILY, size=10, bold=True, color=COLOR_DARK_SLATE)
FONT_TABLE_HEADER    = Font(name=FONT_FAMILY, size=9.5, bold=True, color=COLOR_WHITE)
FONT_REGULAR         = Font(name=FONT_FAMILY, size=9.5, color=COLOR_DARK_SLATE)
FONT_REGULAR_BOLD    = Font(name=FONT_FAMILY, size=9.5, bold=True, color=COLOR_DARK_SLATE)
FONT_LABEL           = Font(name=FONT_FAMILY, size=9, bold=True, color=COLOR_MUTED_SLATE)
FONT_MUTED_ITALIC    = Font(name=FONT_FAMILY, size=9, italic=True, color=COLOR_LIGHT_MUTED)

FONT_DISCOUNT        = Font(name=FONT_FAMILY, size=9.5, bold=True, color=COLOR_SUCCESS_GREEN)
FONT_GRAND_TOTAL_LBL = Font(name=FONT_FAMILY, size=11, bold=True, color=COLOR_ORANGE_PRIMARY)
FONT_GRAND_TOTAL_VAL = Font(name=FONT_FAMILY, size=12, bold=True, color=COLOR_ORANGE_PRIMARY)

FONT_STATUS_HIGH     = Font(name=FONT_FAMILY, size=9.5, bold=True, color=COLOR_SUCCESS_GREEN)
FONT_STATUS_MED      = Font(name=FONT_FAMILY, size=9.5, bold=True, color=COLOR_WARNING_AMBER)
FONT_STATUS_LOW      = Font(name=FONT_FAMILY, size=9.5, bold=True, color=COLOR_DANGER_RED)

FONT_FOOTER          = Font(name=FONT_FAMILY, size=8.5, italic=True, color=COLOR_VERY_MUTED)

# ─── Fills ───────────────────────────────────────────────────────────────────
FILL_SECTION_BANNER  = PatternFill(start_color=COLOR_BG_BANNER, end_color=COLOR_BG_BANNER, fill_type="solid")
FILL_TABLE_HEADER    = PatternFill(start_color=COLOR_DARK_SLATE, end_color=COLOR_DARK_SLATE, fill_type="solid")
FILL_TOTAL_ROW       = PatternFill(start_color=COLOR_BG_ORANGE, end_color=COLOR_BG_ORANGE, fill_type="solid")
FILL_ZEBRA           = PatternFill(start_color=COLOR_BG_ZEBRA, end_color=COLOR_BG_ZEBRA, fill_type="solid")

# ─── Borders ─────────────────────────────────────────────────────────────────
BORDER_THIN_SIDE     = Side(style="thin", color=COLOR_BORDER_LIGHT)
BORDER_MEDIUM_SIDE   = Side(style="medium", color=COLOR_BORDER)
BORDER_ORANGE_SIDE   = Side(style="medium", color=COLOR_ORANGE_PRIMARY)
BORDER_DOUBLE_ORANGE = Side(style="double", color=COLOR_ORANGE_PRIMARY)

BORDER_CELL          = Border(top=BORDER_THIN_SIDE, bottom=BORDER_THIN_SIDE, left=BORDER_THIN_SIDE, right=BORDER_THIN_SIDE)
BORDER_SECTION       = Border(top=BORDER_THIN_SIDE, bottom=BORDER_THIN_SIDE, left=BORDER_THIN_SIDE, right=BORDER_THIN_SIDE)
BORDER_TOTAL         = Border(top=BORDER_THIN_SIDE, bottom=BORDER_DOUBLE_ORANGE, left=BORDER_THIN_SIDE, right=BORDER_THIN_SIDE)
BORDER_DIVIDER       = Border(bottom=BORDER_ORANGE_SIDE)

# ─── Alignments ──────────────────────────────────────────────────────────────
ALIGN_LEFT           = Alignment(horizontal="left", vertical="center")
ALIGN_RIGHT          = Alignment(horizontal="right", vertical="center")
ALIGN_CENTER         = Alignment(horizontal="center", vertical="center")
ALIGN_WRAP_LEFT      = Alignment(horizontal="left", vertical="center", wrap_text=True)

# ─── Number Formats ──────────────────────────────────────────────────────────
FORMAT_CURRENCY      = '"₹"#,##0.00'
FORMAT_QUANTITY      = '#,##0.##'
FORMAT_INT           = '#,##0'


def _get_ist_timezone():
    try:
        return ZoneInfo("Asia/Kolkata")
    except Exception:
        from datetime import timedelta
        return timezone(timedelta(hours=5, minutes=30), name="IST")

IST_TZ = _get_ist_timezone()


def _format_datetime(dt: datetime | None) -> str:
    if not dt:
        return "—"
    # Convert UTC to IST if datetime is timezone-aware
    if dt.tzinfo is not None:
        dt = dt.astimezone(IST_TZ)
    return dt.strftime("%d %b %Y, %I:%M %p")


def _adjust_dimensions_dynamically(ws: openpyxl.worksheet.worksheet.Worksheet) -> None:
    """Calculate and set adaptive, content-aware column widths and row heights for 100% visibility."""
    # Base minimum and maximum constraints per structural column
    min_col_widths = {
        1: 22,  # Col A: Fits "Vendor / Merchant:", "Receipt / Invoice #:", "Document Date:"
        2: 38,  # Col B: Fits descriptions, vendor names, addresses
        3: 18,  # Col C: Fits "Document ID:", "Uploaded At:", "Lifecycle Status:", "Qty"
        4: 22,  # Col D: Fits "Unit Price", "Original File:"
        5: 20,  # Col E: Fits "Line Total", monetary amounts up to millions
    }
    max_col_widths = {
        1: 28,
        2: 52,
        3: 26,
        4: 30,
        5: 28,
    }

    # 1. Measure longest unmerged cell values per column
    col_max_lengths: dict[int, int] = {}
    for row in ws.iter_rows():
        for cell in row:
            if cell.value is not None:
                val_str = str(cell.value).strip()
                if not val_str:
                    continue
                # Skip merged wide banners (e.g. title, section headers)
                if any(
                    cell.coordinate in rng
                    for rng in ws.merged_cells.ranges
                    if rng.min_col == 1 and rng.max_col >= 4
                ):
                    continue
                # Measure length of lines
                line_lengths = [len(line) for line in val_str.split("\n")]
                max_line = max(line_lengths) if line_lengths else len(val_str)
                col_max_lengths[cell.column] = max(col_max_lengths.get(cell.column, 0), max_line)

    # Set calculated column widths
    for col_idx in range(1, 6):
        measured = col_max_lengths.get(col_idx, min_col_widths[col_idx])
        target_width = max(min_col_widths[col_idx], min(max_col_widths[col_idx], measured + 3))
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = target_width

    # 2. Dynamic Row Height Calculation for Wrapped Content (Precomputed Merged Map)
    merged_width_map: dict[tuple[int, int], int] = {}
    for rng in ws.merged_cells.ranges:
        span_w = sum(
            ws.column_dimensions[get_column_letter(c)].width or 20
            for c in range(rng.min_col, rng.max_col + 1)
        )
        for r in range(rng.min_row, rng.max_row + 1):
            for c in range(rng.min_col, rng.max_col + 1):
                merged_width_map[(r, c)] = span_w

    for row_idx in range(1, ws.max_row + 1):
        existing_height = ws.row_dimensions[row_idx].height or 20
        max_needed_height = existing_height

        for cell in ws[row_idx]:
            if cell.value is not None:
                val_str = str(cell.value).strip()
                if not val_str:
                    continue

                col_width = merged_width_map.get(
                    (row_idx, cell.column),
                    ws.column_dimensions[get_column_letter(cell.column)].width or 20
                )

                # Count explicit newlines
                explicit_lines = len(val_str.split("\n"))
                # Estimate wrapped lines based on effective width
                char_limit = max(15, int(col_width * 0.90))
                wrapped_lines = max(1, math.ceil(len(val_str) / char_limit))
                estimated_lines = max(explicit_lines, wrapped_lines)

                if estimated_lines > 1:
                    needed_height = max(24, estimated_lines * 18 + 6)
                    max_needed_height = max(max_needed_height, min(120, needed_height))

        ws.row_dimensions[row_idx].height = max_needed_height


def generate_document_excel_bytes(
    data: ExportDocumentData | CreatedDocumentMetadata | dict[str, Any]
) -> bytes:
    """Generate a professionally formatted STRUCTRA Excel workbook (.xlsx) in memory."""
    if not isinstance(data, ExportDocumentData):
        data = map_document_to_export_data(data)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Document Report"

    # View configuration: clean grid lines
    ws.views.sheetView[0].showGridLines = True

    # Print setup: single page width fit, A4 portrait
    ws.page_setup.orientation = ws.ORIENTATION_PORTRAIT
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.page_margins.left = 0.6
    ws.page_margins.right = 0.6
    ws.page_margins.top = 0.7
    ws.page_margins.bottom = 0.7

    current_row = 1

    # ─── 1. BRANDING & HEADER ────────────────────────────────────────────────
    # Row 1: Brand Title (Left) + Document Report Label (Right)
    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=3)
    title_cell = ws.cell(row=current_row, column=1, value="STRUCTRA")
    title_cell.font = FONT_BRAND_TITLE
    title_cell.alignment = ALIGN_LEFT

    ws.merge_cells(start_row=current_row, start_column=4, end_row=current_row, end_column=5)
    report_tag_cell = ws.cell(row=current_row, column=4, value="DOCUMENT INTELLIGENCE REPORT")
    report_tag_cell.font = FONT_DOC_REPORT_TAG
    report_tag_cell.alignment = ALIGN_RIGHT
    ws.row_dimensions[current_row].height = 24
    current_row += 1

    # Row 2: Subtitle (Left) + Generation Timestamp in IST (Right)
    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=3)
    subtitle_cell = ws.cell(row=current_row, column=1, value="AI DOCUMENT INTELLIGENCE • VERIFIED DOCUMENT REPORT")
    subtitle_cell.font = FONT_BRAND_SUBTITLE
    subtitle_cell.alignment = ALIGN_LEFT

    ws.merge_cells(start_row=current_row, start_column=4, end_row=current_row, end_column=5)
    # Generate timestamp strictly in Indian Standard Time (Asia/Kolkata)
    exp_date_str = datetime.now(IST_TZ).strftime("%d %b %Y, %I:%M %p IST")
    exp_date_cell = ws.cell(row=current_row, column=4, value=f"Generated: {exp_date_str}")
    exp_date_cell.font = FONT_EXPORT_DATE
    exp_date_cell.alignment = ALIGN_RIGHT
    ws.row_dimensions[current_row].height = 16
    current_row += 1

    # Row 3: Accent Divider Line
    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=5)
    for c in range(1, 6):
        ws.cell(row=current_row, column=c).border = BORDER_DIVIDER
    ws.row_dimensions[current_row].height = 6
    current_row += 2  # Leave clean breathing space

    # ─── 2. DOCUMENT INFORMATION SECTION ─────────────────────────────────────
    # Banner Header
    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=5)
    sec1_cell = ws.cell(row=current_row, column=1, value="DOCUMENT INFORMATION")
    sec1_cell.font = FONT_SECTION_HEADER
    sec1_cell.fill = FILL_SECTION_BANNER
    sec1_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    for c in range(1, 6):
        ws.cell(row=current_row, column=c).border = BORDER_SECTION
    ws.row_dimensions[current_row].height = 22
    current_row += 1

    doc_info_rows = [
        ("Vendor / Merchant:", data.vendor_name or "—", "Document ID:", data.document_id),
        ("Vendor Address:", data.vendor_address or "—", "Original File:", data.filename),
        ("Receipt / Invoice #:", data.invoice_number or "—", "Uploaded At:", _format_datetime(data.created_at)),
        ("Document Date:", data.document_date or "—", "Lifecycle Status:", (data.status or "completed").upper()),
    ]

    for label1, val1, label2, val2 in doc_info_rows:
        ws.row_dimensions[current_row].height = 20
        # Col A: Label 1
        c_l1 = ws.cell(row=current_row, column=1, value=label1)
        c_l1.font = FONT_LABEL
        c_l1.alignment = ALIGN_LEFT
        c_l1.border = BORDER_CELL

        # Col B: Value 1
        c_v1 = ws.cell(row=current_row, column=2, value=val1)
        c_v1.font = FONT_REGULAR_BOLD if label1 == "Vendor / Merchant:" else FONT_REGULAR
        c_v1.alignment = ALIGN_WRAP_LEFT
        c_v1.border = BORDER_CELL

        # Col C: Label 2
        c_l2 = ws.cell(row=current_row, column=3, value=label2)
        c_l2.font = FONT_LABEL
        c_l2.alignment = ALIGN_LEFT
        c_l2.border = BORDER_CELL

        # Col D-E: Value 2 (Merged)
        ws.merge_cells(start_row=current_row, start_column=4, end_row=current_row, end_column=5)
        c_v2 = ws.cell(row=current_row, column=4, value=val2)
        c_v2.font = FONT_REGULAR
        c_v2.alignment = ALIGN_WRAP_LEFT
        for c in range(4, 6):
            ws.cell(row=current_row, column=c).border = BORDER_CELL

        current_row += 1

    current_row += 1  # Breathing space divider

    # ─── 3. PURCHASED ITEMS SECTION ──────────────────────────────────────────
    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=5)
    sec2_cell = ws.cell(row=current_row, column=1, value="PURCHASED ITEMS")
    sec2_cell.font = FONT_SECTION_HEADER
    sec2_cell.fill = FILL_SECTION_BANNER
    sec2_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    for c in range(1, 6):
        ws.cell(row=current_row, column=c).border = BORDER_SECTION
    ws.row_dimensions[current_row].height = 22
    current_row += 1

    # Table Header Row
    headers = [
        ("#", ALIGN_CENTER),
        ("Item Description", ALIGN_LEFT),
        ("Qty", ALIGN_RIGHT),
        ("Unit Price", ALIGN_RIGHT),
        ("Line Total", ALIGN_RIGHT),
    ]
    ws.row_dimensions[current_row].height = 22
    for col_idx, (header_text, alignment) in enumerate(headers, 1):
        c = ws.cell(row=current_row, column=col_idx, value=header_text)
        c.font = FONT_TABLE_HEADER
        c.fill = FILL_TABLE_HEADER
        c.alignment = alignment
        c.border = BORDER_CELL
    current_row += 1

    # Table Data Rows
    if data.line_items:
        for idx, item in enumerate(data.line_items, 1):
            ws.row_dimensions[current_row].height = 20
            row_fill = FILL_ZEBRA if idx % 2 == 0 else None

            # Col A: #
            c_idx = ws.cell(row=current_row, column=1, value=idx)
            c_idx.font = FONT_REGULAR
            c_idx.alignment = ALIGN_CENTER
            c_idx.number_format = FORMAT_INT
            c_idx.border = BORDER_CELL
            if row_fill:
                c_idx.fill = row_fill

            # Col B: Description
            c_desc = ws.cell(row=current_row, column=2, value=item.description)
            c_desc.font = FONT_REGULAR
            c_desc.alignment = ALIGN_WRAP_LEFT
            c_desc.border = BORDER_CELL
            if row_fill:
                c_desc.fill = row_fill

            # Col C: Quantity
            c_qty = ws.cell(row=current_row, column=3, value=item.quantity if item.quantity is not None else "—")
            c_qty.font = FONT_REGULAR
            c_qty.alignment = ALIGN_RIGHT
            if item.quantity is not None:
                c_qty.number_format = FORMAT_QUANTITY
            c_qty.border = BORDER_CELL
            if row_fill:
                c_qty.fill = row_fill

            # Col D: Unit Price
            c_up = ws.cell(row=current_row, column=4, value=item.unit_price if item.unit_price is not None else "—")
            c_up.font = FONT_REGULAR
            c_up.alignment = ALIGN_RIGHT
            if item.unit_price is not None:
                c_up.number_format = FORMAT_CURRENCY
            c_up.border = BORDER_CELL
            if row_fill:
                c_up.fill = row_fill

            # Col E: Line Total
            c_tot = ws.cell(row=current_row, column=5, value=item.line_total if item.line_total is not None else "—")
            c_tot.font = FONT_REGULAR_BOLD
            c_tot.alignment = ALIGN_RIGHT
            if item.line_total is not None:
                c_tot.number_format = FORMAT_CURRENCY
            c_tot.border = BORDER_CELL
            if row_fill:
                c_tot.fill = row_fill

            current_row += 1
    else:
        # Empty Line Items placeholder
        ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=5)
        empty_cell = ws.cell(row=current_row, column=1, value="No itemized line items extracted for this document.")
        empty_cell.font = FONT_MUTED_ITALIC
        empty_cell.alignment = ALIGN_CENTER
        ws.row_dimensions[current_row].height = 22
        for col_idx in range(1, 6):
            ws.cell(row=current_row, column=col_idx).border = BORDER_CELL
        current_row += 1

    current_row += 1  # Breathing space divider

    # ─── 4. FINANCIAL SUMMARY SECTION ────────────────────────────────────────
    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=5)
    sec3_cell = ws.cell(row=current_row, column=1, value="FINANCIAL SUMMARY")
    sec3_cell.font = FONT_SECTION_HEADER
    sec3_cell.fill = FILL_SECTION_BANNER
    sec3_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    for c in range(1, 6):
        ws.cell(row=current_row, column=c).border = BORDER_SECTION
    ws.row_dimensions[current_row].height = 22
    current_row += 1

    # Financial Rows collection
    fin_rows: list[tuple[str, float | None, Font]] = []
    if data.subtotal is not None:
        fin_rows.append(("Subtotal:", data.subtotal, FONT_REGULAR_BOLD))
    if data.discount is not None and data.discount > 0:
        fin_rows.append(("Discount:", -abs(data.discount), FONT_DISCOUNT))
    if data.taxable_amount is not None:
        fin_rows.append(("Taxable Amount:", data.taxable_amount, FONT_REGULAR_BOLD))

    # Add tax components or general tax
    if data.tax_components:
        for tc in data.tax_components:
            rate_label = f" ({tc.rate}%)" if tc.rate is not None else ""
            fin_rows.append((f"Tax — {tc.name}{rate_label}:", tc.amount, FONT_REGULAR_BOLD))
    elif data.tax is not None:
        fin_rows.append(("Tax:", data.tax, FONT_REGULAR_BOLD))

    if data.service_charge is not None and data.service_charge > 0:
        fin_rows.append(("Service Charge:", data.service_charge, FONT_REGULAR_BOLD))
    if data.round_off is not None and data.round_off != 0:
        fin_rows.append(("Round Off:", data.round_off, FONT_REGULAR_BOLD))

    # Render intermediate financial rows
    for label, val, font_style in fin_rows:
        ws.row_dimensions[current_row].height = 20
        ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=4)
        lbl_cell = ws.cell(row=current_row, column=1, value=label)
        lbl_cell.font = FONT_LABEL
        lbl_cell.alignment = ALIGN_RIGHT
        for c in range(1, 5):
            ws.cell(row=current_row, column=c).border = BORDER_CELL

        val_cell = ws.cell(row=current_row, column=5, value=val if val is not None else "—")
        val_cell.font = font_style
        val_cell.alignment = ALIGN_RIGHT
        if isinstance(val, (int, float)):
            val_cell.number_format = FORMAT_CURRENCY
        val_cell.border = BORDER_CELL
        current_row += 1

    # GRAND TOTAL (Prominently Highlighted Row)
    ws.row_dimensions[current_row].height = 26
    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=4)
    tot_lbl = ws.cell(row=current_row, column=1, value="GRAND TOTAL:")
    tot_lbl.font = FONT_GRAND_TOTAL_LBL
    tot_lbl.alignment = ALIGN_RIGHT
    tot_lbl.fill = FILL_TOTAL_ROW
    for c in range(1, 5):
        cell_m = ws.cell(row=current_row, column=c)
        cell_m.border = BORDER_TOTAL
        cell_m.fill = FILL_TOTAL_ROW

    tot_val = ws.cell(row=current_row, column=5, value=data.total if data.total is not None else "—")
    tot_val.font = FONT_GRAND_TOTAL_VAL
    tot_val.alignment = ALIGN_RIGHT
    tot_val.fill = FILL_TOTAL_ROW
    tot_val.border = BORDER_TOTAL
    if isinstance(data.total, (int, float)):
        tot_val.number_format = FORMAT_CURRENCY
    current_row += 2  # Breathing space divider

    # ─── 5. QUALITY & VALIDATION SECTION ─────────────────────────────────────
    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=5)
    sec4_cell = ws.cell(row=current_row, column=1, value="QUALITY & VERIFICATION")
    sec4_cell.font = FONT_SECTION_HEADER
    sec4_cell.fill = FILL_SECTION_BANNER
    sec4_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    for c in range(1, 6):
        ws.cell(row=current_row, column=c).border = BORDER_SECTION
    ws.row_dimensions[current_row].height = 22
    current_row += 1

    # Confidence display with semantic font
    conf_level = (data.confidence_level or "HIGH").upper()
    if data.confidence_override:
        conf_display = f"{conf_level} (User Verified Override)"
        conf_font = FONT_STATUS_HIGH
    elif data.confidence_score is not None:
        conf_display = f"{conf_level} • {data.confidence_score * 100:.1f}% Confidence"
        conf_font = FONT_STATUS_HIGH if conf_level == "HIGH" else (FONT_STATUS_MED if conf_level == "MEDIUM" else FONT_STATUS_LOW)
    else:
        conf_display = conf_level
        conf_font = FONT_STATUS_HIGH if conf_level == "HIGH" else FONT_STATUS_MED

    # Arithmetic Validation display
    if data.arithmetic_validated is None:
        math_display = "Standard Extraction • No Multi-Item Checks"
        math_font = FONT_REGULAR
    elif data.arithmetic_matches is True:
        math_display = "PASSED • All line items & totals reconcile exactly"
        math_font = FONT_STATUS_HIGH
    elif data.arithmetic_matches is False:
        math_display = "DISCREPANCY • Document total differs from calculated item sum"
        math_font = FONT_STATUS_LOW
    else:
        math_display = "Verified"
        math_font = FONT_REGULAR

    # Review status display
    if data.needs_review:
        review_display = "NEEDS REVIEW • High-precision verification advised"
        review_font = FONT_STATUS_MED
    else:
        review_display = "VERIFIED • Ready for accounting / records"
        review_font = FONT_STATUS_HIGH

    qual_rows = [
        ("Extraction Confidence:", conf_display, conf_font),
        ("Arithmetic Validation:", math_display, math_font),
        ("Review State:", review_display, review_font),
    ]

    for q_lbl, q_val, q_font in qual_rows:
        ws.row_dimensions[current_row].height = 20
        # Col A-B: Label
        ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=2)
        c_ql = ws.cell(row=current_row, column=1, value=q_lbl)
        c_ql.font = FONT_LABEL
        c_ql.alignment = ALIGN_LEFT
        for c in range(1, 3):
            ws.cell(row=current_row, column=c).border = BORDER_CELL

        # Col C-E: Value
        ws.merge_cells(start_row=current_row, start_column=3, end_row=current_row, end_column=5)
        c_qv = ws.cell(row=current_row, column=3, value=q_val)
        c_qv.font = q_font
        c_qv.alignment = ALIGN_WRAP_LEFT
        for c in range(3, 6):
            ws.cell(row=current_row, column=c).border = BORDER_CELL

        current_row += 1

    # Optional Warning list if present
    if data.issues:
        for iss in data.issues:
            ws.row_dimensions[current_row].height = 19
            ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=5)
            c_iss = ws.cell(row=current_row, column=1, value=f"• Note: {iss}")
            c_iss.font = FONT_MUTED_ITALIC
            c_iss.alignment = ALIGN_WRAP_LEFT
            for c in range(1, 6):
                ws.cell(row=current_row, column=c).border = BORDER_CELL
            current_row += 1

    current_row += 2  # Breathing space divider

    # ─── 6. FOOTER ───────────────────────────────────────────────────────────
    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=5)
    footer_cell = ws.cell(
        row=current_row,
        column=1,
        value="Generated by STRUCTRA AI Document Intelligence Platform • Confidential Document Report",
    )
    footer_cell.font = FONT_FOOTER
    footer_cell.alignment = ALIGN_CENTER
    ws.row_dimensions[current_row].height = 18

    # ─── 7. CONTENT-AWARE DYNAMIC SIZING (WIDTHS & HEIGHTS) ─────────────────
    _adjust_dimensions_dynamically(ws)

    # Save workbook directly into in-memory byte buffer
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream.getvalue()
