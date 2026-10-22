"""Comprehensive backend unit and integration tests for RetailIQ multi-user workspace architecture."""

import io
import pytest
from fastapi.testclient import TestClient
import openpyxl

from app.main import app
from app.database.session import SessionLocal
from app.services.workspace_service import create_workspace, populate_sample_workspace, clear_workspace_data

@pytest.fixture
def client():
    """Context-managed TestClient that executes FastAPI lifespan startup & shutdown."""
    with TestClient(app) as c:
        c.cookies.clear()
        yield c


def test_health_endpoint(client):
    """Verify health endpoint returns ok and reports database connectivity."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app_name"] == "RetailIQ"
    assert data["database"] == "connected"


def test_workspace_initialization_and_cookie(client):
    """Verify that requests without a session token automatically receive a new isolated workspace and cookie."""
    resp = client.post("/api/workspaces/init")
    assert resp.status_code == 200
    data = resp.json()
    assert "workspace_id" in data
    assert "session_token" in data
    assert data["workspace_id"].startswith("ws_")
    assert "retailiq_session" in resp.cookies


def test_multi_user_workspace_isolation(client):
    """
    CRITICAL TEST: Multi-user workspace isolation.
    1. Client A creates Workspace A and ingests Dataset A (Product Alpha).
    2. Client B creates Workspace B and ingests Dataset B (Product Beta).
    3. Verify Client A sees ONLY Product Alpha and its metrics.
    4. Verify Client B sees ONLY Product Beta and its metrics.
    5. Verify clearing Workspace A does NOT touch Workspace B.
    """
    # 1. Initialize Client A
    resp_a = client.post("/api/workspaces/init")
    ws_a = resp_a.json()
    token_a = ws_a["session_token"]
    headers_a = {"X-Workspace-Token": token_a}

    csv_a = (
        "date,product_id,product_name,category,units_sold,unit_price\n"
        "2026-02-01,SKU-ALPHA,Organic Almonds,Dry Fruits,50,450.00\n"
        "2026-02-02,SKU-ALPHA,Organic Almonds,Dry Fruits,60,450.00\n"
    )
    import_resp_a = client.post(
        "/api/data/import",
        files={"file": ("alpha_sales.csv", io.BytesIO(csv_a.encode("utf-8")), "text/csv")},
        headers=headers_a
    )
    assert import_resp_a.status_code == 200
    assert import_resp_a.json()["rows_imported"] == 2

    # 2. Initialize Client B (simulating another user/browser with clean session)
    client.cookies.clear()
    resp_b = client.post("/api/workspaces/init")
    ws_b = resp_b.json()
    token_b = ws_b["session_token"]
    headers_b = {"X-Workspace-Token": token_b}

    assert ws_a["workspace_id"] != ws_b["workspace_id"]

    csv_b = (
        "date,product_id,product_name,category,units_sold,unit_price\n"
        "2026-02-01,SKU-BETA,Soy Milk 1L,Dairy Alternatives,25,85.00\n"
    )
    import_resp_b = client.post(
        "/api/data/import",
        files={"file": ("beta_sales.csv", io.BytesIO(csv_b.encode("utf-8")), "text/csv")},
        headers=headers_b
    )
    assert import_resp_b.status_code == 200
    assert import_resp_b.json()["rows_imported"] == 1

    # 3. Verify Client A sees ONLY SKU-ALPHA
    dash_a = client.get("/api/dashboard/summary", headers=headers_a).json()
    assert dash_a["total_units_sold"] == 110.0
    assert dash_a["total_products"] == 1
    prods_a = client.get("/api/products", headers=headers_a).json()
    assert len(prods_a) == 1
    assert prods_a[0]["product_id"] == "SKU-ALPHA"

    # 4. Verify Client B sees ONLY SKU-BETA
    dash_b = client.get("/api/dashboard/summary", headers=headers_b).json()
    assert dash_b["total_units_sold"] == 25.0
    assert dash_b["total_products"] == 1
    prods_b = client.get("/api/products", headers=headers_b).json()
    assert len(prods_b) == 1
    assert prods_b[0]["product_id"] == "SKU-BETA"

    # 5. Clear Workspace A and verify Workspace B is untouched
    clear_resp = client.post("/api/workspaces/clear", headers=headers_a)
    assert clear_resp.status_code == 200

    dash_a_after = client.get("/api/dashboard/summary", headers=headers_a).json()
    assert dash_a_after["total_units_sold"] == 0.0
    assert dash_a_after["has_data"] is False

    dash_b_after = client.get("/api/dashboard/summary", headers=headers_b).json()
    assert dash_b_after["total_units_sold"] == 25.0
    assert dash_b_after["has_data"] is True


def test_sample_workspace_creation(client):
    """Verify that creating a sample workspace clones the demo retail dataset safely."""
    resp = client.post("/api/workspaces/sample")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_sample"] is True
    token = data["session_token"]
    headers = {"X-Workspace-Token": token}

    status = client.get("/api/workspaces/current", headers=headers).json()
    assert status["is_sample"] is True
    assert status["has_data"] is True
    assert status["products_count"] > 0
    assert status["sales_count"] > 0


def test_sales_analytics_date_filtering(client):
    """Verify date filtering in sales analytics correctly bounds the results."""
    # Use sample workspace
    resp = client.post("/api/workspaces/sample")
    headers = {"X-Workspace-Token": resp.json()["session_token"]}

    # Filter with specific date range
    res_filtered = client.get("/api/analytics/sales?start_date=2025-11-01&end_date=2025-11-15", headers=headers)
    assert res_filtered.status_code == 200
    data = res_filtered.json()
    assert data["has_data"] is True
    for item in data["daily_sales"]:
        assert item["date"] >= "2025-11-01"
        assert item["date"] <= "2025-11-15"

    # Inverted date range should return 400
    res_bad = client.get("/api/analytics/sales?start_date=2025-12-01&end_date=2025-11-01", headers=headers)
    assert res_bad.status_code == 400


def test_excel_sheets_inspection_and_upload(client):
    """Verify inspecting multi-sheet Excel files and uploading XLSX files."""
    resp = client.post("/api/workspaces/init")
    headers = {"X-Workspace-Token": resp.json()["session_token"]}

    # Create an in-memory workbook with 2 sheets
    wb = openpyxl.Workbook()
    ws1 = wb.active
    ws1.title = "Notes"
    ws1.append(["Note", "Author"])
    ws1.append(["Meeting notes", "Store Manager"])

    ws2 = wb.create_sheet(title="Weekly_Sales")
    ws2.append(["date", "product_id", "product_name", "category", "units_sold", "unit_price"])
    ws2.append(["2026-03-01", "P-TEST", "Cold Pressed Juice", "Beverages", 40, 120.00])
    ws2.append(["2026-03-02", "P-TEST", "Cold Pressed Juice", "Beverages", 45, 120.00])

    buf = io.BytesIO()
    wb.save(buf)
    excel_bytes = buf.getvalue()

    # 1. Test sheets inspection
    sheet_resp = client.post(
        "/api/data/sheets",
        files={"file": ("store_records.xlsx", io.BytesIO(excel_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    assert sheet_resp.status_code == 200
    sheets_info = sheet_resp.json()
    assert sheets_info["is_excel"] is True
    assert "Weekly_Sales" in sheets_info["sheets"]
    assert "Notes" in sheets_info["sheets"]

    # 2. Test preview with target sheet
    prev_resp = client.post(
        "/api/data/preview",
        files={"file": ("store_records.xlsx", io.BytesIO(excel_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"sheet_name": "Weekly_Sales"}
    )
    assert prev_resp.status_code == 200
    assert prev_resp.json()["valid"] is True
    assert prev_resp.json()["total_rows"] == 2

    # 3. Test import with target sheet
    imp_resp = client.post(
        "/api/data/import",
        files={"file": ("store_records.xlsx", io.BytesIO(excel_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"sheet_name": "Weekly_Sales"},
        headers=headers
    )
    assert imp_resp.status_code == 200
    assert imp_resp.json()["rows_imported"] == 2


def test_inventory_recommendation_and_product_update(client):
    """Verify inventory recommendations and user product updates."""
    resp = client.post("/api/workspaces/init")
    headers = {"X-Workspace-Token": resp.json()["session_token"]}

    csv_data = (
        "date,product_id,product_name,category,units_sold,unit_price,current_stock,supplier_lead_time_days,safety_stock_units\n"
        "2026-03-01,SKU-INV,Premium Jasmine Tea,Beverages,20,250.00,15,5,10\n"
        "2026-03-02,SKU-INV,Premium Jasmine Tea,Beverages,20,250.00,15,5,10\n"
    )
    client.post(
        "/api/data/import",
        files={"file": ("inventory_sales.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")},
        headers=headers
    )

    # Fetch recommendations
    inv_res = client.get("/api/inventory/recommendations", headers=headers).json()
    assert inv_res["total_products"] == 1
    rec = inv_res["recommendations"][0]
    assert rec["product_id"] == "SKU-INV"
    assert rec["recommended_order_quantity"] > 0
    assert rec["status"] in ["Reorder Required", "Low Stock", "Out of Stock"]

    # Update product inventory manually
    update_res = client.put(
        "/api/inventory/products/SKU-INV",
        json={"current_stock": 250, "supplier_lead_time_days": 3, "safety_stock_units": 15},
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["current_stock"] == 250.0

    # Recommendation should now reflect healthy stock
    inv_res2 = client.get("/api/inventory/recommendations", headers=headers).json()
    assert inv_res2["recommendations"][0]["status"] == "Healthy"
    assert inv_res2["recommendations"][0]["recommended_order_quantity"] == 0
