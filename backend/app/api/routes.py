"""REST API routes for RetailIQ with multi-user workspace isolation."""

import io
import logging
from datetime import datetime, date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request, Response
from fastapi.responses import StreamingResponse, Response as RawResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import (
    Workspace, Product, SalesRecord, ForecastRun, ForecastResult, DataImport,
)
from app.schemas.schemas import (
    HealthResponse, WorkspaceOut, WorkspaceStatusResponse,
    DashboardSummary, SalesAnalytics, CategoryAnalytics,
    ProductOut, ProductUpdateInput, ForecastRequest, ForecastResponse,
    InventoryResponse, InventoryRecommendation,
    ExcelSheetsResponse, DataPreviewResponse, DataImportResponse, DataImportHistoryOut,
)
from app.services import workspace_service, analytics_service, data_service
from app.services.model_service import model_service
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Workspace Session Dependency ─────────────────────────
def get_current_workspace(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> Workspace:
    """
    Ensure every visitor has a private, isolated workspace session.
    Reads token from HttpOnly cookie 'retailiq_session' or 'X-Workspace-Token' header.
    Automatically initializes a fresh anonymous workspace if missing or expired.
    """
    # Header takes priority over cookie to allow explicit client token overrides
    token = request.headers.get("x-workspace-token") or request.cookies.get(workspace_service.SESSION_COOKIE_NAME)

    ws = None
    if token:
        ws = workspace_service.get_workspace_by_token(db, token)

    if not ws:
        # Create fresh anonymous tenant workspace
        ws = workspace_service.create_workspace(db, name="My Workspace")
        # Set cookie for browser sessions
        response.set_cookie(
            key=workspace_service.SESSION_COOKIE_NAME,
            value=ws.session_token,
            max_age=workspace_service.DEFAULT_EXPIRY_DAYS * 86400,
            httponly=True,
            samesite="lax",
            secure=settings.environment == "production",
            path="/",
        )
        logger.info("Initialized new anonymous workspace %s for request", ws.workspace_id)

    return ws


# ── Workspace Endpoints ──────────────────────────────────
@router.post("/workspaces/init", response_model=WorkspaceOut, tags=["Workspace"])
def init_workspace(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    force_new: bool = Query(False),
):
    """Get the current active workspace or create a fresh one."""
    if force_new:
        ws = workspace_service.create_workspace(db, name="My Workspace")
        response.set_cookie(
            key=workspace_service.SESSION_COOKIE_NAME,
            value=ws.session_token,
            max_age=workspace_service.DEFAULT_EXPIRY_DAYS * 86400,
            httponly=True,
            samesite="lax",
            secure=settings.environment == "production",
            path="/",
        )
        return ws
    ws = get_current_workspace(request, response, db)
    return ws


@router.post("/workspaces/sample", response_model=WorkspaceOut, tags=["Workspace"])
def create_sample_workspace(
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Create an isolated sample workspace with the prepared retail demo dataset.
    Never alters user uploads and prevents collisions between users.
    """
    ws = workspace_service.create_workspace(db, name="Sample Store Demo", is_sample=True)
    workspace_service.populate_sample_workspace(db, ws)

    response.set_cookie(
        key=workspace_service.SESSION_COOKIE_NAME,
        value=ws.session_token,
        max_age=workspace_service.DEFAULT_EXPIRY_DAYS * 86400,
        httponly=True,
        samesite="lax",
        secure=settings.environment == "production",
        path="/",
    )
    return ws


@router.get("/workspaces/current", response_model=WorkspaceStatusResponse, tags=["Workspace"])
def get_current_workspace_status(
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """Get active workspace telemetry and record counts."""
    stats = workspace_service.get_workspace_stats(db, ws.workspace_id)
    return WorkspaceStatusResponse(
        workspace_id=ws.workspace_id,
        name=ws.name,
        is_sample=ws.is_sample,
        products_count=stats["products_count"],
        sales_count=stats["sales_count"],
        imports_count=stats["imports_count"],
        date_range=stats["date_range"],
        has_data=stats["has_data"],
        expires_at=ws.expires_at,
    )


@router.post("/workspaces/clear", tags=["Workspace"])
def clear_workspace(
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """Clear all data belonging to the current workspace without affecting any other visitor."""
    result = workspace_service.clear_workspace_data(db, ws.workspace_id)
    return result


# ── Health ────────────────────────────────────────────────
@router.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint. Reports application, database, and model readiness."""
    db_status = "unknown"
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    if model_service.model_loaded:
        model_status = "loaded"
    elif model_service.model_available_on_disk:
        model_status = "ready"
    else:
        model_status = "unavailable"

    return HealthResponse(
        status="ok",
        app_available=True,
        app_name=settings.app_name,
        version=settings.app_version,
        database=db_status,
        model=model_status,
        model_loaded=model_service.model_loaded,
        model_available_on_disk=model_service.model_available_on_disk,
        model_path=str(model_service.artifacts_dir) if model_service.artifacts_dir else None,
        model_error=model_service.load_error,
        environment=settings.environment,
        timestamp=datetime.utcnow(),
    )


# ── Dashboard ─────────────────────────────────────────────
@router.get("/dashboard/summary", response_model=DashboardSummary, tags=["Dashboard"])
def dashboard_summary(
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """Dashboard summary scoped strictly to the active workspace."""
    return analytics_service.get_dashboard_summary(db, ws.workspace_id)


# ── Sales Analytics ───────────────────────────────────────
@router.get("/analytics/sales", response_model=SalesAnalytics, tags=["Analytics"])
def sales_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    product_id: Optional[str] = None,
    category: Optional[str] = None,
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """Sales analytics for the active workspace with verified date/category filters."""
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date.")
    return analytics_service.get_sales_analytics(db, ws.workspace_id, start_date, end_date, product_id, category)


@router.get("/analytics/categories", response_model=CategoryAnalytics, tags=["Analytics"])
def category_analytics(
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """Category performance breakdown for the active workspace."""
    return analytics_service.get_category_analytics(db, ws.workspace_id)


# ── Products ──────────────────────────────────────────────
@router.get("/products", response_model=List[ProductOut], tags=["Products"])
def list_products(
    category: Optional[str] = None,
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """List products in the active workspace."""
    q = db.query(Product).filter(Product.workspace_id == ws.workspace_id)
    if category:
        q = q.filter(Product.category == category)
    return q.order_by(Product.product_name).all()


@router.put("/inventory/products/{product_id}", response_model=ProductOut, tags=["Inventory"])
def update_product_inventory(
    product_id: str,
    update_data: ProductUpdateInput,
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """Allow users to update stock, lead time, or safety stock for any product in their workspace."""
    product = db.query(Product).filter(
        Product.workspace_id == ws.workspace_id,
        Product.product_id == product_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found in this workspace.")

    if update_data.current_stock is not None:
        product.current_stock = update_data.current_stock
    if update_data.supplier_lead_time_days is not None:
        product.supplier_lead_time_days = update_data.supplier_lead_time_days
    if update_data.safety_stock_units is not None:
        product.safety_stock_units = update_data.safety_stock_units

    db.commit()
    db.refresh(product)
    return product


# ── Demand Forecasting ────────────────────────────────────
@router.post("/forecast", response_model=ForecastResponse, tags=["Forecast"])
def generate_forecast(
    request: ForecastRequest,
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """Generate multi-day demand forecasts for selected products in the active workspace."""
    try:
        result = model_service.generate_workspace_forecast(
            db=db,
            workspace_id=ws.workspace_id,
            product_ids=request.product_ids,
            horizon_days=request.horizon_days,
        )
        return ForecastResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Forecast error:")
        raise HTTPException(status_code=500, detail=f"Failed to generate demand forecast: {e}")


@router.get("/forecast/products", tags=["Forecast"])
def forecast_products(
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """List products eligible for demand forecasting in the active workspace."""
    products = db.query(Product).filter(Product.workspace_id == ws.workspace_id).order_by(Product.product_name).all()
    return [{
        "product_id": p.product_id,
        "product_name": p.product_name,
        "category": p.category,
        "unit_price": p.unit_price,
    } for p in products]


@router.get("/forecast/history", tags=["Forecast"])
def forecast_history(
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """List prior forecast runs scoped to the active workspace."""
    runs = db.query(ForecastRun).filter(ForecastRun.workspace_id == ws.workspace_id).order_by(ForecastRun.run_date.desc()).limit(20).all()
    return [{
        "id": r.id,
        "run_date": r.run_date,
        "model_name": r.model_name,
        "horizon_days": r.horizon_days,
        "products_count": r.products_count,
        "status": r.status,
    } for r in runs]


# ── Inventory Intelligence ────────────────────────────────
@router.get("/inventory/recommendations", response_model=InventoryResponse, tags=["Inventory"])
def inventory_recommendations(
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """
    Inventory intelligence recommendations strictly computed for the active workspace.
    Formula: max(0, forecast_demand_during_lead_time + safety_stock - current_stock)
    """
    recommendations = analytics_service.get_workspace_reorder_alerts(db, ws.workspace_id)
    reorder_count = len([r for r in recommendations if r.get("recommended_order_quantity", 0) > 0])
    low_stock = len([r for r in recommendations if r.get("status") == "Low Stock"])
    out_stock = len([r for r in recommendations if r.get("status") == "Out of Stock"])
    healthy = len([r for r in recommendations if r.get("status") == "Healthy"])

    recs_out = [InventoryRecommendation(**r) for r in recommendations]

    return InventoryResponse(
        recommendations=recs_out,
        total_products=len(recs_out),
        reorder_required_count=reorder_count,
        low_stock_count=low_stock,
        out_of_stock_count=out_stock,
        healthy_count=healthy,
        last_updated=datetime.utcnow().isoformat(),
    )


# ── Data Management (Upload & Ingestion) ──────────────────
@router.post("/data/sheets", response_model=ExcelSheetsResponse, tags=["Data"])
async def inspect_sheets(file: UploadFile = File(...)):
    """Inspect sheets in an uploaded Excel file so user can pick the target worksheet."""
    _validate_file_extension(file.filename or "")
    contents = await file.read()
    sheets = data_service.inspect_excel_sheets(contents, file.filename or "")
    return ExcelSheetsResponse(
        filename=file.filename or "",
        sheets=sheets,
        is_excel=len(sheets) > 0,
    )


@router.post("/data/preview", response_model=DataPreviewResponse, tags=["Data"])
async def preview_upload(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None),
):
    """Validate and preview file contents before final ingestion."""
    _validate_file_extension(file.filename or "")
    contents = await file.read()
    try:
        result = data_service.validate_and_preview(contents, file.filename or "", sheet_name=sheet_name)
        return DataPreviewResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error inspecting file: {e}")


@router.post("/data/import", response_model=DataImportResponse, tags=["Data"])
async def import_upload(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None),
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """Import sales dataset into the active workspace."""
    _validate_file_extension(file.filename or "")
    contents = await file.read()
    try:
        result = data_service.import_data(
            file_bytes=contents,
            filename=file.filename or "",
            db=db,
            workspace_id=ws.workspace_id,
            sheet_name=sheet_name,
        )
        return DataImportResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")


@router.get("/data/imports", response_model=List[DataImportHistoryOut], tags=["Data"])
def import_history(
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """List data import history for the active workspace."""
    imports = (
        db.query(DataImport)
        .filter(DataImport.workspace_id == ws.workspace_id)
        .order_by(DataImport.imported_at.desc())
        .limit(20)
        .all()
    )
    return imports


@router.get("/data/template/{format}", tags=["Data"])
def download_sample_template(format: str):
    """Download clean sample templates (CSV or XLSX)."""
    fmt = format.lower()
    if fmt == "csv":
        sample_csv = (
            "date,product_id,product_name,category,units_sold,unit_price,discount_pct,promotion_flag,current_stock,supplier_lead_time_days,safety_stock_units\n"
            "2026-01-01,SKU-001,Basmati Rice 5kg,Staples,45,360.00,0.0,0,500,7,30\n"
            "2026-01-01,SKU-002,Whole Wheat Flour 5kg,Staples,38,280.00,0.0,0,450,7,25\n"
            "2026-01-01,SKU-003,Assam Tea 250g,Beverages,60,165.00,5.0,1,180,5,20\n"
            "2026-01-01,SKU-004,Instant Noodles Pack,Packaged Food,120,25.00,10.0,1,300,4,50\n"
        )
        return StreamingResponse(
            io.StringIO(sample_csv),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=retailiq_sales_template.csv"}
        )
    elif fmt in ["xlsx", "excel"]:
        excel_bytes = data_service.generate_sample_excel_template()
        return StreamingResponse(
            io.BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=retailiq_sales_template.xlsx"}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Supported: csv, xlsx")


# ── Export ────────────────────────────────────────────────
@router.get("/export/sales", tags=["Export"])
def export_sales(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    product_id: Optional[str] = None,
    ws: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """Export filtered sales data from the active workspace as CSV."""
    import pandas as pd

    q = db.query(SalesRecord).filter(SalesRecord.workspace_id == ws.workspace_id)
    if start_date:
        q = q.filter(SalesRecord.date >= start_date)
    if end_date:
        q = q.filter(SalesRecord.date <= end_date)
    if product_id:
        q = q.filter(SalesRecord.product_id == product_id)

    records = q.order_by(SalesRecord.date).all()
    if not records:
        raise HTTPException(status_code=404, detail="No sales records found for the given criteria in your workspace.")

    data = [{
        "date": r.date,
        "product_id": r.product_id,
        "units_sold": r.units_sold,
        "unit_price": r.unit_price,
        "discount_pct": r.discount_pct,
        "promotion_flag": r.promotion_flag,
        "revenue": r.revenue,
    } for r in records]

    df = pd.DataFrame(data)
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales_export.csv"},
    )


def _validate_file_extension(filename: str):
    allowed = (".csv", ".xlsx", ".xls", ".xlsm")
    if not filename.lower().endswith(allowed):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported file formats: {', '.join(allowed)}"
        )
