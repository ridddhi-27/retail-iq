"""Pydantic schemas for RetailIQ (Multi-User Workspace Isolated)."""

from datetime import date, datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


# ── Workspace & Session ──────────────────────────────────
class WorkspaceOut(BaseModel):
    workspace_id: str
    session_token: str
    name: str
    is_sample: bool
    created_at: datetime
    expires_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceStatusResponse(BaseModel):
    workspace_id: str
    name: str
    is_sample: bool
    products_count: int
    sales_count: int
    imports_count: int
    date_range: Dict[str, Optional[str]]
    has_data: bool
    expires_at: datetime


# ── Health ────────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str = "ok"
    app_name: str = "RetailIQ"
    version: str = "1.0.0"
    database: str = "unknown"
    model: str = "unknown"
    model_loaded: bool = False
    model_path: Optional[str] = None
    model_error: Optional[str] = None
    environment: str = "development"
    timestamp: datetime


# ── Products ──────────────────────────────────────────────
class ProductOut(BaseModel):
    product_id: str
    product_name: str
    category: str
    unit_price: Optional[float] = None
    current_stock: Optional[float] = 0.0
    supplier_lead_time_days: Optional[int] = 5
    safety_stock_units: Optional[float] = 0.0

    model_config = {"from_attributes": True}


class ProductUpdateInput(BaseModel):
    current_stock: Optional[float] = Field(None, ge=0)
    supplier_lead_time_days: Optional[int] = Field(None, ge=1, le=90)
    safety_stock_units: Optional[float] = Field(None, ge=0)


# ── Sales ─────────────────────────────────────────────────
class SalesRecordOut(BaseModel):
    product_id: str
    date: date
    units_sold: float
    unit_price: Optional[float] = None
    discount_pct: Optional[float] = None
    promotion_flag: Optional[int] = None
    revenue: Optional[float] = None

    model_config = {"from_attributes": True}


# ── Dashboard ─────────────────────────────────────────────
class DashboardSummary(BaseModel):
    total_units_sold: float = 0
    total_revenue: float = 0
    total_products: int = 0
    total_categories: int = 0
    low_stock_count: int = 0
    reorder_required_count: int = 0
    data_date_range: Optional[Dict[str, Optional[str]]] = None
    monthly_sales: List[Dict[str, Any]] = []
    revenue_trend: List[Dict[str, Any]] = []
    category_performance: List[Dict[str, Any]] = []
    top_products: List[Dict[str, Any]] = []
    reorder_alerts: List[Dict[str, Any]] = []
    has_data: bool = False


# ── Analytics ─────────────────────────────────────────────
class SalesAnalytics(BaseModel):
    daily_sales: List[Dict[str, Any]] = []
    monthly_sales: List[Dict[str, Any]] = []
    revenue_trends: List[Dict[str, Any]] = []
    product_rankings: List[Dict[str, Any]] = []
    category_comparison: List[Dict[str, Any]] = []
    day_of_week_patterns: List[Dict[str, Any]] = []
    discount_analysis: List[Dict[str, Any]] = []
    total_units_sold: float = 0
    total_revenue: float = 0
    avg_daily_sales: float = 0
    has_data: bool = False


class CategoryAnalytics(BaseModel):
    categories: List[Dict[str, Any]] = []


# ── Forecast ──────────────────────────────────────────────
class ForecastRequest(BaseModel):
    product_ids: List[str] = Field(..., min_length=1)
    horizon_days: int = Field(default=30, ge=1, le=30)


class ForecastResultOut(BaseModel):
    product_id: str
    product_name: Optional[str] = None
    category: Optional[str] = None
    forecast_date: date
    predicted_units_sold: float
    assumed_unit_price: Optional[float] = None
    assumed_discount_pct: Optional[float] = None
    assumed_promotion_flag: Optional[int] = None


class ForecastResponse(BaseModel):
    run_id: Optional[int] = None
    model_name: str = "Extra Trees Regressor"
    horizon_days: int
    products_count: int
    total_predicted_units: float
    avg_daily_forecast: float = 0
    highest_demand_day: Optional[str] = None
    forecasts: List[ForecastResultOut] = []
    status: str = "completed"
    message: Optional[str] = None


# ── Inventory ─────────────────────────────────────────────
class InventoryRecommendation(BaseModel):
    product_id: str
    product_name: str
    category: str
    current_stock: float
    lead_time_days: int
    forecast_demand_during_lead_time: float
    safety_stock_units: float
    recommended_order_quantity: float
    status: str  # "Healthy", "Low Stock", "Reorder Required", "Out of Stock"
    priority: int = 0
    suggested_action: str = ""


class InventoryResponse(BaseModel):
    recommendations: List[InventoryRecommendation] = []
    total_products: int = 0
    reorder_required_count: int = 0
    low_stock_count: int = 0
    out_of_stock_count: int = 0
    healthy_count: int = 0
    last_updated: Optional[str] = None


# ── Data Import ───────────────────────────────────────────
class ExcelSheetsResponse(BaseModel):
    filename: str
    sheets: List[str]
    is_excel: bool


class DataPreviewResponse(BaseModel):
    filename: str
    file_size_bytes: int
    sheet_name: Optional[str] = None
    total_rows: int
    columns: List[str]
    preview_rows: List[Dict[str, Any]] = []
    missing_values: Dict[str, int] = {}
    duplicate_count: int = 0
    required_columns_present: List[str] = []
    missing_required_columns: List[str] = []
    warnings: List[str] = []
    valid: bool = True
    supports_forecasting: bool = True
    supports_inventory: bool = True


class DataImportResponse(BaseModel):
    import_id: Optional[int] = None
    filename: str
    status: str
    rows_total: int = 0
    rows_imported: int = 0
    rows_skipped: int = 0
    rows_errors: int = 0
    error_message: Optional[str] = None
    message: str = ""


class DataImportHistoryOut(BaseModel):
    id: int
    filename: str
    file_size_bytes: Optional[int]
    rows_total: Optional[int]
    rows_imported: Optional[int]
    rows_skipped: Optional[int]
    status: str
    imported_at: datetime

    model_config = {"from_attributes": True}
