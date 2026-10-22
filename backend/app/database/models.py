"""SQLAlchemy ORM models for RetailIQ (Multi-User Workspace Scoped)."""

from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, Boolean,
    Text, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.database.session import Base


class Workspace(Base):
    """Isolated tenant workspace for anonymous visitors."""
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(String(64), unique=True, nullable=False, index=True)
    session_token = Column(String(128), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, default="My Workspace")
    is_sample = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_accessed_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

    products = relationship("Product", back_populates="workspace", cascade="all, delete-orphan")
    sales_records = relationship("SalesRecord", back_populates="workspace", cascade="all, delete-orphan")
    forecast_runs = relationship("ForecastRun", back_populates="workspace", cascade="all, delete-orphan")
    data_imports = relationship("DataImport", back_populates="workspace", cascade="all, delete-orphan")


class Product(Base):
    """Product master table scoped to workspace."""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(String(64), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(50), nullable=False, index=True)
    product_name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    unit_price = Column(Float, nullable=True)
    current_stock = Column(Float, nullable=True, default=0)
    supplier_lead_time_days = Column(Integer, nullable=True, default=5)
    safety_stock_units = Column(Float, nullable=True, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="products")

    __table_args__ = (
        UniqueConstraint("workspace_id", "product_id", name="uq_workspace_product"),
        Index("ix_products_ws_id", "workspace_id"),
        Index("ix_products_ws_cat", "workspace_id", "category"),
    )


class SalesRecord(Base):
    """Historical daily sales records scoped to workspace."""
    __tablename__ = "sales_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(String(64), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(50), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    units_sold = Column(Float, nullable=False, default=0)
    unit_price = Column(Float, nullable=True)
    discount_pct = Column(Float, nullable=True, default=0)
    promotion_flag = Column(Integer, nullable=True, default=0)
    revenue = Column(Float, nullable=True)
    stock_on_hand_end_of_day = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="sales_records")

    __table_args__ = (
        UniqueConstraint("workspace_id", "product_id", "date", name="uq_workspace_product_date"),
        Index("ix_sales_ws_date", "workspace_id", "date"),
        Index("ix_sales_ws_prod", "workspace_id", "product_id"),
    )


class ForecastRun(Base):
    """Metadata about forecast generation runs scoped to workspace."""
    __tablename__ = "forecast_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(String(64), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False, index=True)
    run_date = Column(DateTime, default=datetime.utcnow, index=True)
    model_name = Column(String(100), nullable=True)
    horizon_days = Column(Integer, nullable=False, default=30)
    products_count = Column(Integer, nullable=True)
    status = Column(String(50), default="completed")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="forecast_runs")
    results = relationship("ForecastResult", back_populates="run", cascade="all, delete-orphan")


class ForecastResult(Base):
    """Individual forecast data points scoped to workspace."""
    __tablename__ = "forecast_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(String(64), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False, index=True)
    run_id = Column(Integer, ForeignKey("forecast_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(50), nullable=False, index=True)
    forecast_date = Column(Date, nullable=False)
    predicted_units_sold = Column(Float, nullable=False)
    assumed_unit_price = Column(Float, nullable=True)
    assumed_discount_pct = Column(Float, nullable=True)
    assumed_promotion_flag = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("ForecastRun", back_populates="results")

    __table_args__ = (
        Index("ix_forecast_ws_prod_date", "workspace_id", "product_id", "forecast_date"),
    )


class DataImport(Base):
    """Record of data file imports scoped to workspace."""
    __tablename__ = "data_imports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(String(64), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    rows_total = Column(Integer, nullable=True, default=0)
    rows_imported = Column(Integer, nullable=True, default=0)
    rows_skipped = Column(Integer, nullable=True, default=0)
    rows_errors = Column(Integer, nullable=True, default=0)
    status = Column(String(50), default="pending")
    error_message = Column(Text, nullable=True)
    imported_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    workspace = relationship("Workspace", back_populates="data_imports")
