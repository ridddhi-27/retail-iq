import pytest
import tempfile
from pathlib import Path
from datetime import date, timedelta, datetime
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.services.model_service import ModelService
from app.database.session import SessionLocal
from app.database.models import Workspace, Product, SalesRecord


def test_model_discovery_and_lightweight_startup():
    """Verify startup initialization is lightweight and finds the model on disk."""
    svc = ModelService()
    svc.initialize()
    status = svc.get_status()

    assert status["model_available_on_disk"] is True, "Model should be detected on disk"
    assert status["model_loaded"] is False, "Model binary should NOT be loaded into memory at startup (prevents OOM)"
    assert status["feature_columns"] == 14, "Expected 14 feature columns loaded in metadata"
    assert status["metrics_available"] is True, "Metrics should be available"


def test_health_endpoint_distinguishes_app_and_model():
    """Verify /health endpoint differentiates application readiness from model memory state."""
    with TestClient(app) as client:
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["app_available"] is True
        assert data["database"] == "connected"
        assert data["model_available_on_disk"] is True
        # Model status should be 'ready' (ready on disk) or 'loaded' (in RAM)
        assert data["model"] in ["ready", "loaded"]


def test_live_inference_on_demand_and_memory_cleanup():
    """Verify model loads on demand when a forecast is requested and produces valid predictions."""
    svc = ModelService()
    svc.initialize()
    db = SessionLocal()
    ws_id = "test_mem_forecast_ws"

    try:
        ws = Workspace(
            workspace_id=ws_id,
            session_token="test_mem_token",
            name="Memory Test WS",
            is_sample=False,
            expires_at=datetime.utcnow() + timedelta(days=1),
        )
        db.add(ws)

        prod = Product(
            workspace_id=ws_id,
            product_id="P001",
            product_name="Basmati Rice 5kg",
            category="Staples",
            unit_price=320.0,
            current_stock=150.0,
        )
        db.add(prod)

        base_date = date(2024, 1, 1)
        for i in range(40):
            d = base_date + timedelta(days=i)
            rec = SalesRecord(
                workspace_id=ws_id,
                product_id="P001",
                date=d,
                units_sold=42.0 + (i % 5),
                unit_price=320.0,
                discount_pct=0.0,
                promotion_flag=0,
                revenue=(42.0 + (i % 5)) * 320.0,
                stock_on_hand_end_of_day=150.0,
            )
            db.add(rec)
        db.commit()

        # Execute forecast - this triggers on-demand model loading and prediction
        forecast = svc.generate_workspace_forecast(
            db=db,
            workspace_id=ws_id,
            product_ids=["P001"],
            horizon_days=5,
        )

        assert svc.model_loaded is True, "Model should now be loaded in memory after forecast request"
        assert forecast["model_name"] == "Extra Trees Regressor", "Should use live Extra Trees Regressor"
        assert len(forecast["forecasts"]) == 5
        assert all(f["predicted_units_sold"] > 0 for f in forecast["forecasts"])

    finally:
        db.query(SalesRecord).filter_by(workspace_id=ws_id).delete()
        db.query(Product).filter_by(workspace_id=ws_id).delete()
        db.query(Workspace).filter_by(workspace_id=ws_id).delete()
        db.commit()
        db.close()


def test_model_unavailable_handling():
    """Verify that when no model is available, clear diagnostics are provided without crashing."""
    with tempfile.TemporaryDirectory() as empty_dir:
        svc = ModelService(artifacts_dir=empty_dir)
        # Attempt to load from empty dir
        loaded = svc._ensure_model_loaded()
        assert loaded is False
        assert svc.model_loaded is False
        assert svc.model_available_on_disk is False
        assert "not found" in svc.load_error.lower()
