"""Seed database with synthetic products and historical sales records."""

import csv
from datetime import datetime, date, timedelta
import random
from pathlib import Path
import pandas as pd
from sqlalchemy.orm import Session

from app.database.session import SessionLocal, init_db
from app.database.models import Product, SalesRecord

def seed_database():
    init_db()
    db: Session = SessionLocal()
    try:
        # Check if products already seeded
        prod_count = db.query(Product).count()
        sales_count = db.query(SalesRecord).count()
        if prod_count > 0 and sales_count > 0:
            print(f"Database already populated: {prod_count} products, {sales_count} sales records.")
            return

        # Load inventory recommendations to get products master metadata
        inv_path = Path(__file__).resolve().parent.parent.parent.parent / "inventory_recommendations.csv"
        forecast_path = Path(__file__).resolve().parent.parent.parent.parent / "forecast_30_days.csv"
        
        if not inv_path.exists():
            print(f"Error: {inv_path} not found.")
            return

        inv_df = pd.read_csv(inv_path)
        forecast_df = pd.read_csv(forecast_path)
        
        # Get unit price per product
        price_map = forecast_df.groupby("product_id")["assumed_unit_price"].first().to_dict()

        products = []
        for _, row in inv_df.iterrows():
            pid = row["product_id"]
            p = Product(
                product_id=pid,
                product_name=row["product_name"],
                category=row["category"],
                unit_price=float(price_map.get(pid, 50.0)),
                current_stock=float(row.get("current_stock", 100.0)),
                supplier_lead_time_days=int(row.get("lead_time_days", 5)),
                safety_stock_units=float(row.get("safety_stock_units", 20.0)),
            )
            products.append(p)
            db.merge(p)
        db.commit()
        print(f"Seeded {len(products)} products into database.")

        # Generate realistic historical daily sales for the past 90 days (up to 2025-12-31)
        # We base daily mean sales on forecast_demand_during_lead_time / lead_time_days
        end_date = date(2025, 12, 31)
        start_date = end_date - timedelta(days=90)

        # Baseline daily demand per product
        daily_base = {}
        for _, row in inv_df.iterrows():
            lead_time = max(1, int(row.get("lead_time_days", 5)))
            lead_demand = float(row.get("forecast_demand_during_lead_time", 100.0))
            daily_base[row["product_id"]] = max(5.0, lead_demand / lead_time)

        random.seed(42)
        sales_records = []
        csv_rows = []

        curr = start_date
        while curr <= end_date:
            is_weekend = curr.weekday() >= 5
            for _, p in inv_df.iterrows():
                pid = p["product_id"]
                pname = p["product_name"]
                cat = p["category"]
                price = float(price_map.get(pid, 50.0))
                base = daily_base[pid]

                # Day of week multiplier
                dow_mult = 1.35 if is_weekend else 0.95
                promo_flag = 1 if (random.random() < 0.12) else 0
                promo_mult = 1.4 if promo_flag else 1.0
                discount = round(random.uniform(5.0, 20.0), 1) if promo_flag else 0.0

                noise = random.gauss(1.0, 0.15)
                units = max(1.0, round(base * dow_mult * promo_mult * noise, 1))
                effective_price = price * (1.0 - discount / 100.0)
                revenue = round(units * effective_price, 2)
                stock_eod = max(0.0, round(float(p.get("current_stock", 100.0)) + random.uniform(-15, 20), 1))

                rec = SalesRecord(
                    product_id=pid,
                    date=curr,
                    units_sold=units,
                    unit_price=price,
                    discount_pct=discount,
                    promotion_flag=promo_flag,
                    revenue=revenue,
                    stock_on_hand_end_of_day=stock_eod,
                )
                sales_records.append(rec)

                csv_rows.append({
                    "date": curr.strftime("%Y-%m-%d"),
                    "product_id": pid,
                    "product_name": pname,
                    "category": cat,
                    "units_sold": units,
                    "unit_price": price,
                    "discount_pct": discount,
                    "promotion_flag": promo_flag,
                    "revenue": revenue,
                    "stock_on_hand_end_of_day": stock_eod,
                    "supplier_lead_time_days": int(p.get("lead_time_days", 5)),
                    "safety_stock_units": float(p.get("safety_stock_units", 20.0)),
                })

            curr += timedelta(days=1)

        db.bulk_save_objects(sales_records)
        db.commit()
        print(f"Seeded {len(sales_records)} daily sales records into database.")

        # Write sample dataset CSV
        data_dir = Path(__file__).resolve().parent.parent.parent.parent / "data"
        data_dir.mkdir(exist_ok=True)
        csv_file = data_dir / "sample_retail_sales.csv"
        
        with open(csv_file, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(csv_rows[0].keys()))
            writer.writeheader()
            writer.writerows(csv_rows)
        print(f"Exported sample CSV to {csv_file} ({len(csv_rows)} rows).")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
