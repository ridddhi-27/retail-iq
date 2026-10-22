"""Workspace isolation & session lifecycle service."""

import logging
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pathlib import Path
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.models import (
    Workspace, Product, SalesRecord, ForecastRun, ForecastResult, DataImport
)

logger = logging.getLogger(__name__)

SESSION_COOKIE_NAME = "retailiq_session"
DEFAULT_EXPIRY_DAYS = 7


def create_workspace(
    db: Session,
    name: str = "My Workspace",
    is_sample: bool = False,
    expiry_days: int = DEFAULT_EXPIRY_DAYS,
) -> Workspace:
    """Create a new isolated tenant workspace with a cryptographically secure token."""
    ws_id = f"ws_{uuid.uuid4().hex[:16]}"
    token = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    expires_at = now + timedelta(days=expiry_days)

    workspace = Workspace(
        workspace_id=ws_id,
        session_token=token,
        name=name,
        is_sample=is_sample,
        created_at=now,
        last_accessed_at=now,
        expires_at=expires_at,
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    logger.info("Created workspace %s (is_sample=%s)", ws_id, is_sample)
    return workspace


def get_workspace_by_token(db: Session, token: str) -> Optional[Workspace]:
    """Retrieve and touch an active workspace by its session token."""
    if not token:
        return None

    ws = db.query(Workspace).filter(Workspace.session_token == token).first()
    if not ws:
        return None

    now = datetime.utcnow()
    # Check if expired
    if ws.expires_at and ws.expires_at < now:
        logger.info("Workspace %s expired on %s", ws.workspace_id, ws.expires_at)
        return None

    # Roll expiration window forward on active access (7 days from now)
    ws.last_accessed_at = now
    ws.expires_at = now + timedelta(days=DEFAULT_EXPIRY_DAYS)
    db.commit()
    return ws


def clear_workspace_data(db: Session, workspace_id: str) -> Dict[str, Any]:
    """
    Completely clear all data belonging to the specified workspace
    without touching any other visitor's workspace.
    """
    logger.info("Clearing data for workspace %s", workspace_id)
    deleted_sales = db.query(SalesRecord).filter(SalesRecord.workspace_id == workspace_id).delete(synchronize_session=False)
    deleted_results = db.query(ForecastResult).filter(ForecastResult.workspace_id == workspace_id).delete(synchronize_session=False)
    deleted_runs = db.query(ForecastRun).filter(ForecastRun.workspace_id == workspace_id).delete(synchronize_session=False)
    deleted_imports = db.query(DataImport).filter(DataImport.workspace_id == workspace_id).delete(synchronize_session=False)
    deleted_products = db.query(Product).filter(Product.workspace_id == workspace_id).delete(synchronize_session=False)

    db.commit()
    return {
        "status": "cleared",
        "workspace_id": workspace_id,
        "deleted_sales": deleted_sales,
        "deleted_products": deleted_products,
        "deleted_forecast_runs": deleted_runs,
    }


def populate_sample_workspace(db: Session, workspace: Workspace) -> int:
    """
    Populate a freshly created sample workspace with the prepared sample dataset,
    ensuring each sample user receives an isolated copy they can interact with.
    """
    inv_path = Path(__file__).resolve().parent.parent.parent.parent / "inventory_recommendations.csv"
    sample_csv = Path(__file__).resolve().parent.parent.parent.parent / "data" / "sample_retail_sales.csv"

    if not sample_csv.exists() or not inv_path.exists():
        logger.warning("Sample dataset files missing at %s or %s", sample_csv, inv_path)
        return 0

    # 1. Products from inventory_recommendations
    inv_df = pd.read_csv(inv_path)
    forecast_path = Path(__file__).resolve().parent.parent.parent.parent / "forecast_30_days.csv"
    price_map = {}
    if forecast_path.exists():
        fdf = pd.read_csv(forecast_path)
        price_map = fdf.groupby("product_id")["assumed_unit_price"].first().to_dict()

    for _, row in inv_df.iterrows():
        pid = str(row["product_id"])
        existing = db.query(Product).filter_by(workspace_id=workspace.workspace_id, product_id=pid).first()
        if existing:
            existing.product_name = str(row["product_name"])
            existing.category = str(row["category"])
            existing.unit_price = float(price_map.get(pid, 50.0))
            existing.current_stock = float(row.get("current_stock", 100.0))
            existing.supplier_lead_time_days = int(row.get("lead_time_days", 5))
            existing.safety_stock_units = float(row.get("safety_stock_units", 20.0))
        else:
            p = Product(
                workspace_id=workspace.workspace_id,
                product_id=pid,
                product_name=str(row["product_name"]),
                category=str(row["category"]),
                unit_price=float(price_map.get(pid, 50.0)),
                current_stock=float(row.get("current_stock", 100.0)),
                supplier_lead_time_days=int(row.get("lead_time_days", 5)),
                safety_stock_units=float(row.get("safety_stock_units", 20.0)),
            )
            db.add(p)
    db.commit()

    # 2. Sales records from sample_retail_sales.csv
    sales_df = pd.read_csv(sample_csv)
    records = []
    for _, row in sales_df.iterrows():
        rec = SalesRecord(
            workspace_id=workspace.workspace_id,
            product_id=row["product_id"],
            date=pd.to_datetime(row["date"]).date(),
            units_sold=float(row.get("units_sold", 0)),
            unit_price=float(row.get("unit_price", 0)) if pd.notna(row.get("unit_price")) else None,
            discount_pct=float(row.get("discount_pct", 0)) if pd.notna(row.get("discount_pct")) else 0,
            promotion_flag=int(row.get("promotion_flag", 0)) if pd.notna(row.get("promotion_flag")) else 0,
            revenue=float(row.get("revenue", 0)) if pd.notna(row.get("revenue")) else None,
            stock_on_hand_end_of_day=float(row.get("stock_on_hand_end_of_day", 0)) if pd.notna(row.get("stock_on_hand_end_of_day")) else None,
        )
        records.append(rec)

    db.bulk_save_objects(records)
    db.commit()
    logger.info("Populated sample workspace %s with %d records", workspace.workspace_id, len(records))
    return len(records)


def cleanup_expired_workspaces(db: Session) -> int:
    """Remove expired temporary workspaces and their cascade data."""
    now = datetime.utcnow()
    expired = db.query(Workspace).filter(Workspace.expires_at < now).all()
    count = 0
    for ws in expired:
        clear_workspace_data(db, ws.workspace_id)
        db.delete(ws)
        count += 1
    if count > 0:
        db.commit()
        logger.info("Cleaned up %d expired workspaces", count)
    return count


def get_workspace_stats(db: Session, workspace_id: str) -> Dict[str, Any]:
    """Get active record counts and metadata for a workspace."""
    prod_count = db.query(func.count(Product.id)).filter(Product.workspace_id == workspace_id).scalar() or 0
    sales_count = db.query(func.count(SalesRecord.id)).filter(SalesRecord.workspace_id == workspace_id).scalar() or 0
    import_count = db.query(func.count(DataImport.id)).filter(DataImport.workspace_id == workspace_id).scalar() or 0

    min_date = db.query(func.min(SalesRecord.date)).filter(SalesRecord.workspace_id == workspace_id).scalar()
    max_date = db.query(func.max(SalesRecord.date)).filter(SalesRecord.workspace_id == workspace_id).scalar()

    return {
        "products_count": prod_count,
        "sales_count": sales_count,
        "imports_count": import_count,
        "date_range": {
            "start": str(min_date) if min_date else None,
            "end": str(max_date) if max_date else None,
        },
        "has_data": sales_count > 0,
    }
