"""Analytics service — scoped to the active workspace with comprehensive date and dimension filters."""

import logging
from typing import Dict, List, Any, Optional
from datetime import date, datetime

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database.models import Product, SalesRecord

logger = logging.getLogger(__name__)


def get_dashboard_summary(db: Session, workspace_id: str) -> Dict[str, Any]:
    """Build the executive dashboard summary strictly scoped to the active workspace."""
    # Check if workspace has any sales records
    sales_count = db.query(func.count(SalesRecord.id)).filter(SalesRecord.workspace_id == workspace_id).scalar() or 0
    if sales_count == 0:
        return {
            "total_units_sold": 0.0,
            "total_revenue": 0.0,
            "total_products": 0,
            "total_categories": 0,
            "low_stock_count": 0,
            "reorder_required_count": 0,
            "data_date_range": None,
            "monthly_sales": [],
            "revenue_trend": [],
            "category_performance": [],
            "top_products": [],
            "reorder_alerts": [],
            "has_data": False,
        }

    total_units = db.query(func.sum(SalesRecord.units_sold)).filter(SalesRecord.workspace_id == workspace_id).scalar() or 0
    total_revenue = db.query(func.sum(SalesRecord.revenue)).filter(SalesRecord.workspace_id == workspace_id).scalar() or 0
    total_products = db.query(func.count(func.distinct(Product.product_id))).filter(Product.workspace_id == workspace_id).scalar() or 0
    total_categories = db.query(func.count(func.distinct(Product.category))).filter(Product.workspace_id == workspace_id).scalar() or 0

    # Date range
    min_date = db.query(func.min(SalesRecord.date)).filter(SalesRecord.workspace_id == workspace_id).scalar()
    max_date = db.query(func.max(SalesRecord.date)).filter(SalesRecord.workspace_id == workspace_id).scalar()
    data_date_range = None
    if min_date and max_date:
        data_date_range = {"start": str(min_date), "end": str(max_date)}

    # Fetch records for time-series aggregation
    records = db.query(
        SalesRecord.date,
        SalesRecord.units_sold,
        SalesRecord.revenue,
        SalesRecord.product_id
    ).filter(SalesRecord.workspace_id == workspace_id).all()

    df = pd.DataFrame([{
        "date": pd.to_datetime(r.date),
        "units_sold": r.units_sold or 0.0,
        "revenue": r.revenue or 0.0,
        "product_id": r.product_id
    } for r in records])

    # Monthly aggregations
    df["month"] = df["date"].dt.strftime("%Y-%m")
    monthly = df.groupby("month").agg(
        units_sold=("units_sold", "sum"),
        revenue=("revenue", "sum")
    ).reset_index().sort_values("month")

    monthly_sales = [{"month": r["month"], "units_sold": round(float(r["units_sold"]), 1)} for _, r in monthly.iterrows()]
    revenue_trend = [{"month": r["month"], "revenue": round(float(r["revenue"]), 2)} for _, r in monthly.iterrows()]

    # Category performance
    cat_query = (
        db.query(
            Product.category,
            func.sum(SalesRecord.units_sold).label("units_sold"),
            func.sum(SalesRecord.revenue).label("revenue")
        )
        .join(SalesRecord, (SalesRecord.product_id == Product.product_id) & (SalesRecord.workspace_id == Product.workspace_id))
        .filter(Product.workspace_id == workspace_id)
        .group_by(Product.category)
        .order_by(desc("revenue"))
        .all()
    )
    category_performance = [{
        "category": r.category,
        "units_sold": round(float(r.units_sold or 0), 1),
        "revenue": round(float(r.revenue or 0), 2)
    } for r in cat_query]

    # Top products
    top_query = (
        db.query(
            Product.product_id,
            Product.product_name,
            Product.category,
            func.sum(SalesRecord.units_sold).label("total_units"),
            func.sum(SalesRecord.revenue).label("total_revenue")
        )
        .join(SalesRecord, (SalesRecord.product_id == Product.product_id) & (SalesRecord.workspace_id == Product.workspace_id))
        .filter(Product.workspace_id == workspace_id)
        .group_by(Product.product_id, Product.product_name, Product.category)
        .order_by(desc("total_units"))
        .limit(10)
        .all()
    )
    top_products = [{
        "product_id": r.product_id,
        "product_name": r.product_name,
        "category": r.category,
        "total_units": round(float(r.total_units or 0), 1),
        "total_revenue": round(float(r.total_revenue or 0), 2)
    } for r in top_query]

    # Reorder alerts for active workspace
    reorder_alerts = get_workspace_reorder_alerts(db, workspace_id)

    return {
        "total_units_sold": round(float(total_units), 1),
        "total_revenue": round(float(total_revenue), 2),
        "total_products": total_products,
        "total_categories": total_categories,
        "low_stock_count": len([r for r in reorder_alerts if r.get("status") in ["Low Stock", "Out of Stock"]]),
        "reorder_required_count": len([r for r in reorder_alerts if r.get("recommended_order_quantity", 0) > 0]),
        "data_date_range": data_date_range,
        "monthly_sales": monthly_sales,
        "revenue_trend": revenue_trend,
        "category_performance": category_performance,
        "top_products": top_products,
        "reorder_alerts": reorder_alerts,
        "has_data": True,
    }


def get_sales_analytics(
    db: Session,
    workspace_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    product_id: Optional[str] = None,
    category: Optional[str] = None,
) -> Dict[str, Any]:
    """Calculate detailed sales analytics for the active workspace with verified date/category filters."""
    base_q = db.query(SalesRecord).filter(SalesRecord.workspace_id == workspace_id)

    if start_date:
        base_q = base_q.filter(SalesRecord.date >= start_date)
    if end_date:
        base_q = base_q.filter(SalesRecord.date <= end_date)
    if product_id:
        base_q = base_q.filter(SalesRecord.product_id == product_id)
    if category:
        base_q = base_q.join(
            Product,
            (Product.product_id == SalesRecord.product_id) & (Product.workspace_id == SalesRecord.workspace_id)
        ).filter(Product.category == category)

    records = base_q.all()
    if not records:
        return {
            "daily_sales": [],
            "monthly_sales": [],
            "revenue_trends": [],
            "product_rankings": [],
            "category_comparison": [],
            "day_of_week_patterns": [],
            "discount_analysis": [],
            "total_units_sold": 0.0,
            "total_revenue": 0.0,
            "avg_daily_sales": 0.0,
            "has_data": False,
        }

    # Build product name & category maps for fast enrichment
    products_db = db.query(Product).filter(Product.workspace_id == workspace_id).all()
    name_map = {p.product_id: p.product_name for p in products_db}
    cat_map = {p.product_id: p.category for p in products_db}

    data = [{
        "date": r.date,
        "product_id": r.product_id,
        "product_name": name_map.get(r.product_id, r.product_id),
        "category": cat_map.get(r.product_id, "General"),
        "units_sold": float(r.units_sold or 0.0),
        "revenue": float(r.revenue or 0.0),
        "discount_pct": float(r.discount_pct or 0.0),
        "promotion_flag": int(r.promotion_flag or 0),
    } for r in records]

    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"])

    total_units = float(df["units_sold"].sum())
    total_rev = float(df["revenue"].sum())
    unique_days = max(1, df["date"].nunique())
    avg_daily = total_units / unique_days

    # Daily aggregation
    daily = df.groupby(df["date"].dt.strftime("%Y-%m-%d")).agg(
        units_sold=("units_sold", "sum"),
        revenue=("revenue", "sum")
    ).reset_index().rename(columns={"date": "date"}).sort_values("date")
    daily_sales = daily.to_dict(orient="records")

    # Monthly aggregation
    df["month"] = df["date"].dt.strftime("%Y-%m")
    monthly = df.groupby("month").agg(
        units_sold=("units_sold", "sum"),
        revenue=("revenue", "sum")
    ).reset_index().sort_values("month")
    monthly_sales = monthly.to_dict(orient="records")
    revenue_trends = monthly_sales

    # Product rankings
    prod_rank = df.groupby(["product_id", "product_name"]).agg(
        total_units=("units_sold", "sum"),
        total_revenue=("revenue", "sum")
    ).reset_index().sort_values("total_units", ascending=False)
    product_rankings = prod_rank.head(30).to_dict(orient="records")

    # Category comparison
    cat_comp = df.groupby("category").agg(
        total_units=("units_sold", "sum"),
        total_revenue=("revenue", "sum"),
        avg_discount=("discount_pct", "mean")
    ).reset_index().sort_values("total_revenue", ascending=False)
    cat_comp["avg_discount"] = cat_comp["avg_discount"].round(1)
    category_comparison = cat_comp.to_dict(orient="records")

    # Day of week patterns
    df["dayofweek"] = df["date"].dt.day_name()
    dow = df.groupby("dayofweek").agg(
        avg_units=("units_sold", "mean"),
        total_units=("units_sold", "sum")
    ).reset_index()
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    dow["dayofweek"] = pd.Categorical(dow["dayofweek"], categories=day_order, ordered=True)
    dow = dow.sort_values("dayofweek")
    dow["avg_units"] = dow["avg_units"].round(1)
    day_of_week_patterns = dow.to_dict(orient="records")

    # Discount analysis
    df["has_discount"] = df["discount_pct"] > 0
    disc = df.groupby("has_discount").agg(
        avg_units=("units_sold", "mean"),
        total_revenue=("revenue", "sum"),
        count=("units_sold", "count")
    ).reset_index()
    disc["has_discount"] = disc["has_discount"].map({True: "Discounted Sales", False: "Full Price Sales"})
    disc["avg_units"] = disc["avg_units"].round(1)
    discount_analysis = disc.to_dict(orient="records")

    return {
        "daily_sales": daily_sales,
        "monthly_sales": monthly_sales,
        "revenue_trends": revenue_trends,
        "product_rankings": product_rankings,
        "category_comparison": category_comparison,
        "day_of_week_patterns": day_of_week_patterns,
        "discount_analysis": discount_analysis,
        "total_units_sold": round(total_units, 1),
        "total_revenue": round(total_rev, 2),
        "avg_daily_sales": round(avg_daily, 1),
        "has_data": True,
    }


def get_category_analytics(db: Session, workspace_id: str) -> Dict[str, Any]:
    """Get category-level summary for the active workspace."""
    results = (
        db.query(
            Product.category,
            func.count(func.distinct(Product.product_id)).label("product_count"),
            func.sum(SalesRecord.units_sold).label("total_units"),
            func.sum(SalesRecord.revenue).label("total_revenue"),
        )
        .join(SalesRecord, (SalesRecord.product_id == Product.product_id) & (SalesRecord.workspace_id == Product.workspace_id))
        .filter(Product.workspace_id == workspace_id)
        .group_by(Product.category)
        .order_by(desc("total_revenue"))
        .all()
    )

    categories = [{
        "category": r.category,
        "product_count": r.product_count,
        "total_units": round(float(r.total_units or 0), 1),
        "total_revenue": round(float(r.total_revenue or 0), 2),
    } for r in results]

    return {"categories": categories}


def get_workspace_reorder_alerts(db: Session, workspace_id: str) -> List[Dict[str, Any]]:
    """Compute workspace inventory reorder recommendations using the transparent baseline formula."""
    products = db.query(Product).filter(Product.workspace_id == workspace_id).all()
    if not products:
        return []

    # Get recent daily demand per product (average over available days)
    sales_q = (
        db.query(
            SalesRecord.product_id,
            func.avg(SalesRecord.units_sold).label("daily_avg"),
            func.max(SalesRecord.stock_on_hand_end_of_day).label("latest_stock")
        )
        .filter(SalesRecord.workspace_id == workspace_id)
        .group_by(SalesRecord.product_id)
        .all()
    )
    demand_map = {r.product_id: float(r.daily_avg or 0.0) for r in sales_q}
    latest_stock_map = {r.product_id: float(r.latest_stock or 0.0) for r in sales_q}

    recommendations = []
    for p in products:
        current_stock = float(p.current_stock if p.current_stock is not None else latest_stock_map.get(p.product_id, 0.0))
        lead_time = int(p.supplier_lead_time_days or 5)
        avg_daily = demand_map.get(p.product_id, 10.0)
        lead_demand = round(avg_daily * lead_time, 1)

        # Safety stock buffer
        safety_stock = float(p.safety_stock_units if (p.safety_stock_units and p.safety_stock_units > 0) else round(lead_demand * 0.2, 1))

        # Baseline formula: max(0, lead_demand + safety_stock - current_stock)
        recommended_order = max(0.0, round(lead_demand + safety_stock - current_stock))

        # Determine status
        if current_stock <= 0:
            status = "Out of Stock"
            action = "Place urgent replenishment order immediately"
        elif recommended_order > 0:
            status = "Reorder Required"
            action = f"Order {int(recommended_order)} units to maintain stock buffer"
        elif current_stock < safety_stock:
            status = "Low Stock"
            action = "Monitor stock velocity closely"
        else:
            status = "Healthy"
            action = "Inventory sufficient for anticipated demand"

        recommendations.append({
            "product_id": p.product_id,
            "product_name": p.product_name,
            "category": p.category,
            "current_stock": current_stock,
            "lead_time_days": lead_time,
            "forecast_demand_during_lead_time": lead_demand,
            "safety_stock_units": safety_stock,
            "recommended_order_quantity": recommended_order,
            "status": status,
            "suggested_action": action,
        })

    # Sort so reorders appear first
    recommendations.sort(key=lambda x: (x["recommended_order_quantity"] <= 0, -x["recommended_order_quantity"]))
    for idx, r in enumerate(recommendations, 1):
        r["priority"] = idx

    return recommendations
