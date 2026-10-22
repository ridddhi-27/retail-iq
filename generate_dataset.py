"""
RetailIQ Large Sample Dataset Generator
Generates ~65,000+ rows of realistic synthetic retail sales data.
Run: python generate_dataset.py
Output: retailiq_sample_large.csv  (same folder)
"""

import csv
import random
import math
from datetime import date, timedelta

random.seed(42)

# ── Products ──────────────────────────────────────────────────────────────────
PRODUCTS = [
    # Staples
    ("P001", "Basmati Rice 5kg",           "Staples",        320, 7,  40),
    ("P002", "Whole Wheat Flour 5kg",       "Staples",        260, 7,  35),
    ("P003", "Refined Sunflower Oil 1L",    "Staples",        155, 5,  30),
    ("P004", "Toor Dal 1kg",                "Staples",        180, 6,  25),
    ("P005", "Chana Dal 1kg",               "Staples",        160, 6,  20),
    ("P006", "Sugar 1kg",                   "Staples",        48,  4,  50),
    ("P007", "Iodised Salt 1kg",            "Staples",        25,  4,  60),
    # Beverages
    ("P008", "Assam Tea 250g",              "Beverages",      175, 5,  25),
    ("P009", "Filter Coffee Powder 200g",   "Beverages",      210, 5,  20),
    ("P010", "Bru Instant Coffee 100g",     "Beverages",      195, 5,  15),
    ("P011", "Tropicana Orange Juice 1L",   "Beverages",      120, 4,  20),
    ("P012", "Rasna Fruit Drink Mix",       "Beverages",      55,  4,  30),
    # Packaged Food
    ("P013", "Maggi Noodles 70g",           "Packaged Food",  14,  3,  80),
    ("P014", "Lays Classic Chips 50g",      "Packaged Food",  20,  3,  60),
    ("P015", "Britannia Good Day 200g",     "Packaged Food",  40,  4,  45),
    ("P016", "Parle-G Biscuits 800g",       "Packaged Food",  80,  4,  55),
    ("P017", "Haldirams Namkeen 400g",      "Packaged Food",  160, 5,  30),
    ("P018", "Amul Butter 500g",            "Dairy",          280, 3,  25),
    # Dairy
    ("P019", "Amul Cheese Slices 200g",     "Dairy",          150, 3,  20),
    ("P020", "Mother Dairy Curd 400g",      "Dairy",          50,  2,  35),
    ("P021", "Nestle Slim Milk 1L",         "Dairy",          68,  2,  40),
    # Personal Care
    ("P022", "Colgate Total Toothpaste",    "Personal Care",  145, 7,  20),
    ("P023", "Dove Soap 75g",               "Personal Care",  55,  5,  25),
    ("P024", "Head & Shoulders Shampoo",    "Personal Care",  270, 6,  15),
    ("P025", "Nivea Moisturizer 200ml",     "Personal Care",  310, 7,  12),
    ("P026", "Dettol Hand Wash 200ml",      "Personal Care",  95,  5,  18),
    # Household
    ("P027", "Surf Excel 1kg",              "Household",      210, 6,  22),
    ("P028", "Vim Bar 200g",                "Household",      30,  5,  40),
    ("P029", "Lizol Disinfectant 500ml",    "Household",      175, 6,  15),
    ("P030", "Harpic Toilet Cleaner 500ml", "Household",      140, 5,  18),
    # Baby Care
    ("P031", "Pampers Diapers Pack",        "Baby Care",      580, 7,  10),
    ("P032", "Johnson Baby Powder 200g",    "Baby Care",      220, 5,  12),
    ("P033", "Cerelac Wheat 300g",          "Baby Care",      290, 6,  8),
    # Snacks & Confectionery
    ("P034", "KitKat 4-Finger 40g",        "Confectionery",  42,  4,  50),
    ("P035", "Dairy Milk Silk 60g",        "Confectionery",  90,  4,  35),
    ("P036", "Mentos Roll",                "Confectionery",  15,  3,  70),
    ("P037", "Kurkure Masala Munch 90g",   "Snacks",         25,  3,  55),
    ("P038", "Bingo Mad Angles 65g",       "Snacks",         20,  3,  50),
    # Health & Wellness
    ("P039", "Dabur Honey 250g",           "Health",         215, 7,  12),
    ("P040", "Himalaya Tulsi Drops 60ml",  "Health",         135, 6,  10),
]

# ── Date range: 3 years (1 Jan 2022 – 31 Dec 2024) ───────────────────────────
START = date(2022, 1, 1)
END   = date(2024, 12, 31)

def date_range(start, end):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)

# ── Helpers ───────────────────────────────────────────────────────────────────
def weekday_factor(d):
    """Friday & Saturday are busier; Tuesday is slowest."""
    return {0: 0.95, 1: 0.88, 2: 0.92, 3: 0.98, 4: 1.18, 5: 1.30, 6: 1.05}[d.weekday()]

def month_factor(m):
    """Oct–Jan festive surge; May–Jun summer dip."""
    factors = {1:1.12, 2:0.95, 3:0.98, 4:0.96, 5:0.90, 6:0.88,
               7:0.93, 8:0.97, 9:1.05, 10:1.20, 11:1.25, 12:1.18}
    return factors[m]

def year_trend(d):
    """Gentle 8% YoY growth."""
    years_since = (d - START).days / 365.0
    return 1.0 + 0.08 * years_since

def promotion_day(d):
    """First & last 3 days of month, Independence Day, Diwali-ish days."""
    if d.day <= 3 or d.day >= 28:
        return True
    if d.month == 8 and d.day == 15:
        return True
    if d.month == 10 and 20 <= d.day <= 27:   # Diwali window
        return True
    if d.month == 11 and 1 <= d.day <= 5:
        return True
    return False

# ── Generate rows ─────────────────────────────────────────────────────────────
rows = []
for pid, pname, cat, price, lead, safety in PRODUCTS:
    # Each product has its own demand base (units/day)
    base_demand = random.uniform(8, 55)
    stock = random.randint(80, 400)

    for d in date_range(START, END):
        promo = 1 if promotion_day(d) else 0
        discount = round(random.choice([0, 0, 0, 5, 10, 15, 20]) + (5 if promo else 0), 1)
        discount = min(discount, 30)

        demand = (
            base_demand
            * weekday_factor(d)
            * month_factor(d.month)
            * year_trend(d)
            * (1 + 0.25 * promo)                 # promo lift
            * (1 + random.gauss(0, 0.12))         # noise
        )
        units = max(0, round(demand))
        revenue = round(units * price * (1 - discount / 100), 2)

        # Simulate rolling stock (simplified)
        stock = max(0, stock - units + random.randint(0, 15))
        stock = min(stock, 600)

        rows.append({
            "date":                    d.isoformat(),
            "product_id":              pid,
            "product_name":            pname,
            "category":               cat,
            "units_sold":              units,
            "unit_price":             price,
            "discount_pct":           discount,
            "promotion_flag":         promo,
            "revenue":                revenue,
            "stock_on_hand_end_of_day": stock,
            "supplier_lead_time_days": lead,
            "safety_stock_units":     safety,
        })

# ── Write CSV ─────────────────────────────────────────────────────────────────
output_file = r"C:\Users\Riddhi\OneDrive\Desktop\retail-iq\retailiq_sample_large.csv"
fieldnames = list(rows[0].keys())

with open(output_file, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

total = len(rows)
print(f"[OK] Dataset generated: {output_file}")
print(f"   Rows  : {total:,}")
print(f"   Products: {len(PRODUCTS)}")
print(f"   Date range: {START} -> {END} ({(END-START).days+1} days)")
print(f"   Columns: {', '.join(fieldnames)}")
