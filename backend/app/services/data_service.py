"""Data import service — validates, normalizes, and stores uploaded CSV/Excel data scoped by workspace."""

import io
import logging
from datetime import datetime, date
from typing import Dict, List, Any, Optional

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database.models import Product, SalesRecord, DataImport

logger = logging.getLogger(__name__)

# Primary canonical column names
REQUIRED_COLUMNS = ["date", "product_name", "units_sold"]
RECOMMENDED_COLUMNS = ["product_id", "category", "unit_price"]
INVENTORY_COLUMNS = ["current_stock", "supplier_lead_time_days", "safety_stock_units"]
ALL_KNOWN_COLUMNS = REQUIRED_COLUMNS + RECOMMENDED_COLUMNS + INVENTORY_COLUMNS
MAX_PREVIEW_ROWS = 20

# Flexible synonyms for column normalization
SYNONYMS = {
    "date": ["date", "transaction_date", "order_date", "sales_date", "invoice_date", "day"],
    "product_name": ["product_name", "product", "item_name", "item", "description", "title", "product_title"],
    "product_id": ["product_id", "sku", "item_id", "product_code", "item_code", "code", "id"],
    "category": ["category", "dept", "department", "product_category", "group", "item_category"],
    "units_sold": ["units_sold", "units", "quantity", "qty", "quantity_sold", "volume", "units_count"],
    "unit_price": ["unit_price", "price", "selling_price", "mrp", "rate", "cost_per_unit"],
    "discount_pct": ["discount_pct", "discount", "discount_percentage", "discount_percent", "discount_%"],
    "promotion_flag": ["promotion_flag", "is_promoted", "promo", "promo_flag", "promotion"],
    "revenue": ["revenue", "sales_revenue", "total_amount", "gross_revenue", "sales_amount"],
    "current_stock": ["current_stock", "stock", "stock_on_hand", "inventory", "stock_level", "stock_units"],
    "stock_on_hand_end_of_day": ["stock_on_hand_end_of_day", "closing_stock", "eod_stock", "end_of_day_stock"],
    "supplier_lead_time_days": ["supplier_lead_time_days", "lead_time_days", "lead_time", "delivery_days"],
    "safety_stock_units": ["safety_stock_units", "safety_stock", "buffer_stock"],
}


def normalize_columns(columns: List[str]) -> Dict[str, str]:
    """Map user-supplied column variations to canonical schema names."""
    mapping = {}
    used_canonicals = set()

    for col in columns:
        cleaned = str(col).strip().lower().replace(" ", "_").replace("-", "_").replace(".", "")
        matched = False
        for canonical, syns in SYNONYMS.items():
            if canonical in used_canonicals:
                continue
            if cleaned == canonical or cleaned in syns:
                mapping[col] = canonical
                used_canonicals.add(canonical)
                matched = True
                break
        if not matched:
            mapping[col] = cleaned
    return mapping


def inspect_excel_sheets(file_bytes: bytes, filename: str) -> List[str]:
    """Return sheet names from an uploaded Excel workbook."""
    fname = filename.lower()
    if fname.endswith((".xlsx", ".xlsm")):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True)
        return wb.sheetnames
    elif fname.endswith(".xls"):
        import xlrd
        wb = xlrd.open_workbook(file_contents=file_bytes)
        return wb.sheet_names()
    return []


def validate_and_preview(
    file_bytes: bytes,
    filename: str,
    sheet_name: Optional[str] = None
) -> Dict[str, Any]:
    """Validate an uploaded file and return a structured preview with diagnostics."""
    df = _read_file(file_bytes, filename, sheet_name=sheet_name)

    # Apply column normalization
    col_mapping = normalize_columns(list(df.columns))
    df = df.rename(columns=col_mapping)

    # Auto-generate product_id if product_name exists
    if "product_name" in df.columns and "product_id" not in df.columns:
        df["product_id"] = df["product_name"].astype(str).str.strip().str.upper().str.replace(" ", "-").str.slice(0, 15)

    if "category" not in df.columns:
        df["category"] = "General"

    present = [c for c in REQUIRED_COLUMNS if c in df.columns]
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]

    warnings: List[str] = []
    if missing:
        warnings.append(f"Missing required columns: {', '.join(missing)}")

    # Missing values
    missing_vals = {col: int(df[col].isna().sum()) for col in df.columns if df[col].isna().any()}

    # Duplicates check
    dup_count = 0
    if "date" in df.columns and "product_id" in df.columns:
        dup_count = int(df.duplicated(subset=["date", "product_id"]).sum())
        if dup_count > 0:
            warnings.append(f"{dup_count} duplicate (date, product_id) rows identified.")

    # Check suitability for forecasting & inventory
    supports_forecasting = "date" in df.columns and "units_sold" in df.columns and len(df) >= 7
    supports_inventory = "current_stock" in df.columns or "stock_on_hand_end_of_day" in df.columns

    if not supports_forecasting and len(missing) == 0:
        warnings.append("Forecasting works best with at least 7 days of daily sales observations.")
    if not supports_inventory:
        warnings.append("Current stock column was not detected; you can set inventory levels in the Inventory tab.")

    preview = df.head(MAX_PREVIEW_ROWS).fillna("").to_dict(orient="records")

    return {
        "filename": filename,
        "file_size_bytes": len(file_bytes),
        "sheet_name": sheet_name,
        "total_rows": len(df),
        "columns": list(df.columns),
        "preview_rows": preview,
        "missing_values": missing_vals,
        "duplicate_count": dup_count,
        "required_columns_present": present,
        "missing_required_columns": missing,
        "warnings": warnings,
        "valid": len(missing) == 0,
        "supports_forecasting": supports_forecasting,
        "supports_inventory": supports_inventory,
    }


def import_data(
    file_bytes: bytes,
    filename: str,
    db: Session,
    workspace_id: str,
    sheet_name: Optional[str] = None
) -> Dict[str, Any]:
    """Import validated data into the database strictly scoped to the workspace."""
    df = _read_file(file_bytes, filename, sheet_name=sheet_name)
    col_mapping = normalize_columns(list(df.columns))
    df = df.rename(columns=col_mapping)

    # Fallback product_id and category
    if "product_name" in df.columns and "product_id" not in df.columns:
        df["product_id"] = df["product_name"].astype(str).str.strip().str.upper().str.replace(" ", "-").str.slice(0, 15)

    if "category" not in df.columns:
        df["category"] = "General"

    # Validate required columns
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        return {
            "status": "error",
            "filename": filename,
            "rows_total": len(df),
            "rows_imported": 0,
            "rows_skipped": 0,
            "rows_errors": 0,
            "error_message": f"Missing required columns: {', '.join(missing)}",
            "message": "Import rejected due to missing required columns.",
        }

    # Parse date
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.date

    # Compute revenue if missing
    if "revenue" not in df.columns and "unit_price" in df.columns:
        discount = df.get("discount_pct", 0)
        df["revenue"] = df["units_sold"] * df["unit_price"] * (1 - discount / 100.0)

    # Create import record
    imp = DataImport(
        workspace_id=workspace_id,
        filename=filename,
        file_size_bytes=len(file_bytes),
        rows_total=len(df),
        status="processing",
    )
    db.add(imp)
    db.flush()

    imported = 0
    skipped = 0
    errors = 0

    # Upsert products scoped to this workspace
    product_df = df[["product_id", "product_name", "category"]].drop_duplicates(subset=["product_id"])
    price_map = df.groupby("product_id")["unit_price"].median().to_dict() if "unit_price" in df.columns else {}
    stock_map = (
        df.groupby("product_id")["current_stock"].last().to_dict() if "current_stock" in df.columns
        else (df.groupby("product_id")["stock_on_hand_end_of_day"].last().to_dict() if "stock_on_hand_end_of_day" in df.columns else {})
    )
    lead_map = df.groupby("product_id")["supplier_lead_time_days"].last().to_dict() if "supplier_lead_time_days" in df.columns else {}
    safety_map = df.groupby("product_id")["safety_stock_units"].last().to_dict() if "safety_stock_units" in df.columns else {}

    existing_products = {
        p.product_id: p
        for p in db.query(Product).filter(Product.workspace_id == workspace_id).all()
    }

    for _, row in product_df.iterrows():
        pid = str(row["product_id"]).strip()
        existing = existing_products.get(pid)

        unit_p = _safe_float(price_map.get(pid))
        cur_stock = _safe_float(stock_map.get(pid)) or 0.0
        lead_t = _safe_int(lead_map.get(pid)) or 5
        safe_s = _safe_float(safety_map.get(pid)) or 0.0

        if not existing:
            p = Product(
                workspace_id=workspace_id,
                product_id=pid,
                product_name=str(row["product_name"]).strip(),
                category=str(row["category"]).strip(),
                unit_price=unit_p,
                current_stock=cur_stock,
                supplier_lead_time_days=lead_t,
                safety_stock_units=safe_s,
            )
            db.add(p)
            existing_products[pid] = p
        else:
            existing.product_name = str(row["product_name"]).strip()
            existing.category = str(row["category"]).strip()
            if unit_p is not None:
                existing.unit_price = unit_p
            if cur_stock > 0:
                existing.current_stock = cur_stock
            if lead_t:
                existing.supplier_lead_time_days = lead_t
            if safe_s > 0:
                existing.safety_stock_units = safe_s

    db.flush()

    # Pre-fetch existing (product_id, date) pairs to do O(1) in-memory duplicate check
    existing_records = db.query(SalesRecord.product_id, SalesRecord.date).filter(
        SalesRecord.workspace_id == workspace_id
    ).all()
    seen_keys = set(existing_records)

    records_batch: List[SalesRecord] = []
    now = datetime.utcnow()
    BATCH_SIZE = 2500

    # Fast row-by-row import using dict iteration
    for row in df.to_dict(orient="records"):
        try:
            row_date = row.get("date")
            units = row.get("units_sold")
            if row_date is None or pd.isna(units):
                skipped += 1
                continue

            pid = str(row.get("product_id", "")).strip()
            if not pid:
                skipped += 1
                continue

            key = (pid, row_date)
            if key in seen_keys:
                skipped += 1
                continue

            seen_keys.add(key)

            u_sold = float(units)
            u_price = _safe_float(row.get("unit_price"))
            disc = _safe_float(row.get("discount_pct"))
            promo = _safe_int(row.get("promotion_flag"))
            rev = _safe_float(row.get("revenue"))
            if rev is None and u_price is not None:
                rev = u_sold * u_price * (1.0 - (disc or 0.0) / 100.0)

            stock_eod = _safe_float(row.get("stock_on_hand_end_of_day"))
            if stock_eod is None:
                stock_eod = _safe_float(row.get("current_stock"))

            records_batch.append(
                SalesRecord(
                    workspace_id=workspace_id,
                    product_id=pid,
                    date=row_date,
                    units_sold=u_sold,
                    unit_price=u_price,
                    discount_pct=disc,
                    promotion_flag=promo,
                    revenue=rev,
                    stock_on_hand_end_of_day=stock_eod,
                    created_at=now,
                )
            )
            imported += 1

            if len(records_batch) >= BATCH_SIZE:
                db.bulk_save_objects(records_batch)
                db.flush()
                records_batch = []

        except Exception as e:
            errors += 1
            logger.warning("Error importing row: %s", e)

    if records_batch:
        db.bulk_save_objects(records_batch)
        db.flush()

    # Update import audit record
    imp.rows_imported = imported
    imp.rows_skipped = skipped
    imp.rows_errors = errors
    imp.status = "completed"
    imp.completed_at = datetime.utcnow()

    db.commit()

    return {
        "import_id": imp.id,
        "filename": filename,
        "status": "completed",
        "rows_total": len(df),
        "rows_imported": imported,
        "rows_skipped": skipped,
        "rows_errors": errors,
        "error_message": None,
        "message": f"Successfully ingested {imported} sales records into your workspace ({skipped} duplicates skipped).",
    }


def generate_sample_excel_template() -> bytes:
    """Generate a clean sample Excel workbook (.xlsx) template for users."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sales_Data"

    headers = [
        "date", "product_id", "product_name", "category",
        "units_sold", "unit_price", "discount_pct", "promotion_flag",
        "current_stock", "supplier_lead_time_days", "safety_stock_units"
    ]
    ws.append(headers)

    sample_rows = [
        ["2026-01-01", "SKU-001", "Basmati Rice 5kg", "Staples", 45, 360.0, 0.0, 0, 500, 7, 30],
        ["2026-01-01", "SKU-002", "Whole Wheat Flour 5kg", "Staples", 38, 280.0, 0.0, 0, 450, 7, 25],
        ["2026-01-01", "SKU-003", "Assam Tea 250g", "Beverages", 60, 165.0, 5.0, 1, 180, 5, 20],
        ["2026-01-01", "SKU-004", "Instant Noodles Pack", "Packaged Food", 120, 25.0, 10.0, 1, 300, 4, 50],
        ["2026-01-02", "SKU-001", "Basmati Rice 5kg", "Staples", 48, 360.0, 0.0, 0, 452, 7, 30],
        ["2026-01-02", "SKU-002", "Whole Wheat Flour 5kg", "Staples", 40, 280.0, 0.0, 0, 410, 7, 25],
    ]
    for row in sample_rows:
        ws.append(row)

    # Style header
    header_fill = PatternFill(start_color="8B8FE8", end_color="8B8FE8", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()


def _read_file(file_bytes: bytes, filename: str, sheet_name: Optional[str] = None) -> pd.DataFrame:
    """Read CSV, XLSX, or XLS bytes into a pandas DataFrame."""
    fname = filename.lower()
    if fname.endswith(".csv"):
        return pd.read_csv(io.BytesIO(file_bytes))
    elif fname.endswith((".xlsx", ".xlsm")):
        if sheet_name:
            return pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet_name, engine="openpyxl")
        return pd.read_excel(io.BytesIO(file_bytes), engine="openpyxl")
    elif fname.endswith(".xls"):
        if sheet_name:
            return pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet_name, engine="xlrd")
        return pd.read_excel(io.BytesIO(file_bytes), engine="xlrd")
    else:
        raise ValueError(f"Unsupported file format: {filename}. Supported formats: .csv, .xlsx, .xls")


def _safe_float(val) -> Optional[float]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _safe_int(val) -> Optional[int]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None
