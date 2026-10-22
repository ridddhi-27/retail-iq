"""ML Model service — loads Extra Trees pipeline and executes workspace-scoped recursive forecasts."""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Optional, Dict, List, Any
from datetime import timedelta, date, datetime

import pandas as pd
from sqlalchemy.orm import Session

from app.database.models import Product, SalesRecord, ForecastRun, ForecastResult, Workspace

logger = logging.getLogger(__name__)

# ── Scikit-Learn cross-version compatibility shims ───────────────────────────
try:
    import sklearn.compose._column_transformer as _ct_mod
    if not hasattr(_ct_mod, '_RemainderColsList'):
        class _RemainderColsList(list):
            __module__ = "sklearn.compose._column_transformer"
        _ct_mod._RemainderColsList = _RemainderColsList
except Exception as _shim_err:
    logger.debug("ColumnTransformer shim note: %s", _shim_err)

try:
    import sklearn.impute as _imp_mod
    if hasattr(_imp_mod, 'SimpleImputer') and not hasattr(_imp_mod.SimpleImputer, '_patched_shim'):
        _orig_transform = _imp_mod.SimpleImputer.transform
        def _compat_transform(self_imputer, X):
            if not hasattr(self_imputer, '_fill_dtype'):
                self_imputer._fill_dtype = getattr(self_imputer, '_fit_dtype', float)
            return _orig_transform(self_imputer, X)
        _imp_mod.SimpleImputer.transform = _compat_transform
        _imp_mod.SimpleImputer._patched_shim = True
except Exception as _shim_err:
    logger.debug("SimpleImputer shim note: %s", _shim_err)


class ModelService:
    """
    Loads the Colab-exported Extra Trees model pipeline (~76MB compressed)
    and executes recursive multi-day demand forecasting scoped by workspace.
    """

    def __init__(self, artifacts_dir: Optional[str] = None):
        self.artifacts_dir: Optional[Path] = Path(artifacts_dir) if artifacts_dir else None
        self.model = None
        self.feature_columns: List[str] = []
        self.metrics: Dict[str, Any] = {}
        self.model_comparison: List[Dict[str, Any]] = []
        self.forecast_df: Optional[pd.DataFrame] = None
        self.inventory_df: Optional[pd.DataFrame] = None
        self.model_loaded = False
        self.forecast_loaded = False
        self.load_error: Optional[str] = None

    @staticmethod
    def discover_artifacts_dir(explicit_path: Optional[str] = None) -> Optional[Path]:
        """
        Robustly locate the directory containing retailiq_model.joblib.
        Checks explicit configuration, environment variables, standard application paths,
        and repository root.
        """
        candidates: List[Path] = []

        # 1. Explicit path passed as argument
        if explicit_path:
            p = Path(explicit_path)
            candidates.append(p.parent if p.is_file() else p)
            candidates.append(Path.cwd() / p)

        # 2. Environment variables
        env_path = os.environ.get("MODEL_PATH")
        if env_path:
            p = Path(env_path)
            candidates.append(p.parent if p.is_file() else p)

        env_dir = os.environ.get("MODEL_DIR")
        if env_dir:
            p = Path(env_dir)
            candidates.append(p)
            candidates.append(Path.cwd() / p)

        # 3. Code-relative canonical paths
        this_file = Path(__file__).resolve()
        services_dir = this_file.parent                    # backend/app/services
        app_dir = services_dir.parent                      # backend/app
        backend_dir = app_dir.parent                       # backend
        repo_root = backend_dir.parent                     # retail-iq

        candidates.extend([
            app_dir / "models",                            # backend/app/models
            backend_dir / "app" / "models",                # backend/app/models
            repo_root / "backend" / "app" / "models",      # repo_root/backend/app/models
            repo_root,                                     # repo_root
            Path.cwd() / "app" / "models",
            Path.cwd() / "backend" / "app" / "models",
            Path.cwd(),
        ])

        for c in candidates:
            try:
                resolved = c.resolve()
                if (resolved / "retailiq_model.joblib").exists():
                    return resolved
            except Exception:
                continue

        return None

    @property
    def model_available_on_disk(self) -> bool:
        if self.artifacts_dir:
            return (self.artifacts_dir / "retailiq_model.joblib").exists()
        discovered = self.discover_artifacts_dir()
        return discovered is not None and (discovered / "retailiq_model.joblib").exists()

    def initialize(self) -> None:
        """
        Lightweight initialization on server startup.
        Discovers artifacts and loads lightweight metadata without unpickling the model binary.
        Prevents Out-Of-Memory (OOM) crashes on 512MB RAM cloud tiers like Render.
        """
        if not self.artifacts_dir or not (self.artifacts_dir / "retailiq_model.joblib").exists():
            discovered = self.discover_artifacts_dir()
            if discovered:
                self.artifacts_dir = discovered
            elif not self.artifacts_dir:
                self.artifacts_dir = Path.cwd()

        self.artifacts_dir = Path(self.artifacts_dir)
        self._load_feature_columns()
        self._load_metrics()
        self._load_model_comparison()

        model_file = self.artifacts_dir / "retailiq_model.joblib"
        if model_file.exists():
            self.load_error = None
            logger.info("ML model verified on disk at %s (ready for on-demand live inference)", model_file)
        else:
            self.load_error = f"Model artifact retailiq_model.joblib not found at {model_file}"
            logger.warning(self.load_error)

        import gc
        gc.collect()

    def load_all(self) -> None:
        """Full synchronous load (useful for local dev/testing)."""
        self.initialize()
        self._load_forecasts()
        self._load_inventory()
        self._ensure_model_loaded()

    def _ensure_model_loaded(self) -> bool:
        """
        Safely loads the Extra Trees model into memory on demand.
        Includes MemoryError handling and explicit garbage collection.
        """
        if self.model_loaded and self.model is not None:
            return True

        if not self.artifacts_dir:
            self.artifacts_dir = self.discover_artifacts_dir()
            if not self.artifacts_dir:
                self.load_error = "Model artifacts directory could not be resolved"
                logger.error(self.load_error)
                return False

        path = self.artifacts_dir / "retailiq_model.joblib"
        if not path.exists():
            self.model_loaded = False
            self.load_error = f"Model artifact retailiq_model.joblib not found at {path}"
            logger.error(self.load_error)
            return False

        import gc
        gc.collect()  # Release memory before unpickling

        try:
            import joblib
            logger.info("Loading Extra Trees ML model from %s ...", path)
            self.model = joblib.load(path)
            self.model_loaded = True
            self.load_error = None
            gc.collect()  # Release temporary unpickling buffers
            logger.info("Loaded retailiq_model.joblib successfully (%s)", type(self.model).__name__)
            return True
        except MemoryError as mem_err:
            self.model = None
            self.model_loaded = False
            self.load_error = (
                "Out of memory loading Extra Trees model. The server has reached its RAM limit (512 MB). "
                "Additional memory is required to execute live inference."
            )
            logger.critical(self.load_error)
            gc.collect()
            return False
        except Exception as e:
            self.model = None
            self.model_loaded = False
            self.load_error = f"Failed to load model from {path}: {e}"
            logger.error(self.load_error, exc_info=True)
            gc.collect()
            return False

    def _load_feature_columns(self) -> None:
        path = self.artifacts_dir / "feature_columns.json"
        if path.exists():
            try:
                with open(path) as f:
                    self.feature_columns = json.load(f)
                logger.info("Loaded feature_columns.json: %d columns", len(self.feature_columns))
            except Exception as e:
                logger.warning("Error reading feature_columns.json: %s", e)

    def _load_metrics(self) -> None:
        path = self.artifacts_dir / "metrics.json"
        if path.exists():
            try:
                with open(path) as f:
                    self.metrics = json.load(f)
            except Exception as e:
                logger.warning("Error reading metrics.json: %s", e)

    def _load_model_comparison(self) -> None:
        path = self.artifacts_dir / "model_comparison.csv"
        if path.exists():
            try:
                df = pd.read_csv(path)
                self.model_comparison = df.to_dict(orient="records")
            except Exception as e:
                logger.warning("Error reading model_comparison.csv: %s", e)

    def _load_forecasts(self) -> None:
        path = self.artifacts_dir / "forecast_30_days.csv"
        if path.exists():
            try:
                self.forecast_df = pd.read_csv(path, parse_dates=["date"])
                self.forecast_loaded = True
                logger.info("Loaded forecast_30_days.csv: %d rows", len(self.forecast_df))
            except Exception as e:
                logger.warning("Error reading forecast_30_days.csv: %s", e)

    def _load_inventory(self) -> None:
        path = self.artifacts_dir / "inventory_recommendations.csv"
        if path.exists():
            try:
                self.inventory_df = pd.read_csv(path)
            except Exception as e:
                logger.warning("Error reading inventory_recommendations.csv: %s", e)

    def _load_model(self) -> None:
        self._ensure_model_loaded()

    def get_status(self) -> Dict[str, Any]:
        return {
            "model_loaded": self.model_loaded,
            "model_available_on_disk": self.model_available_on_disk,
            "model_type": type(self.model).__name__ if self.model else None,
            "artifacts_dir": str(self.artifacts_dir) if self.artifacts_dir else None,
            "forecast_loaded": self.forecast_loaded,
            "forecast_rows": len(self.forecast_df) if self.forecast_df is not None else 0,
            "feature_columns": len(self.feature_columns),
            "metrics_available": bool(self.metrics),
            "load_error": self.load_error,
        }

    def get_metrics(self) -> Dict[str, Any]:
        return self.metrics.copy()

    def get_model_comparison(self) -> List[Dict[str, Any]]:
        return self.model_comparison.copy()

    def generate_workspace_forecast(
        self,
        db: Session,
        workspace_id: str,
        product_ids: List[str],
        horizon_days: int = 30,
    ) -> Dict[str, Any]:
        """
        Generate demand forecasts for requested products strictly within the active workspace.
        Prioritizes live inference using the loaded Extra Trees model pipeline.
        Only falls back to precomputed static forecasts when the live model is genuinely unavailable.
        """
        ws = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
        is_sample = ws.is_sample if ws else False

        # Attempt to load model on demand if available on disk
        if not self.model_loaded and self.model_available_on_disk:
            self._ensure_model_loaded()

        # If live model is NOT loaded and pre-computed forecast is available for sample workspace
        if not self.model_loaded and is_sample:
            forecast_file = (self.artifacts_dir / "forecast_30_days.csv") if self.artifacts_dir else None
            if forecast_file and forecast_file.exists():
                logger.warning(
                    "Live model is unavailable (%s). Using static precomputed forecasts for sample workspace.",
                    self.load_error or "not loaded"
                )
                import gc
                df = pd.read_csv(forecast_file, parse_dates=["date"])
                df = df[df["product_id"].isin(product_ids)]
                if horizon_days < 30:
                    df = df.groupby("product_id").head(horizon_days)

                # Store run in db scoped to workspace
                run = ForecastRun(
                    workspace_id=workspace_id,
                    model_name="Precomputed Baseline (Model Unavailable)",
                    horizon_days=horizon_days,
                    products_count=len(product_ids),
                    status="completed",
                )
                db.add(run)
                db.flush()

                forecast_results = []
                for _, row in df.iterrows():
                    f_date = row["date"].date() if hasattr(row["date"], "date") else row["date"]
                    units_pred = round(float(row["predicted_units_sold"]), 1)
                    u_price = float(row.get("assumed_unit_price", 0)) if row.get("assumed_unit_price") else None
                    disc = float(row.get("assumed_discount_pct", 0)) if row.get("assumed_discount_pct") is not None else 0.0
                    promo = int(row.get("assumed_promotion_flag", 0)) if row.get("assumed_promotion_flag") is not None else 0

                    res = ForecastResult(
                        workspace_id=workspace_id,
                        run_id=run.id,
                        product_id=row["product_id"],
                        forecast_date=f_date,
                        predicted_units_sold=units_pred,
                        assumed_unit_price=u_price,
                        assumed_discount_pct=disc,
                        assumed_promotion_flag=promo,
                    )
                    db.add(res)
                    forecast_results.append({
                        "product_id": row["product_id"],
                        "product_name": row.get("product_name"),
                        "category": row.get("category"),
                        "forecast_date": str(f_date),
                        "predicted_units_sold": units_pred,
                        "assumed_unit_price": u_price,
                        "assumed_discount_pct": disc,
                        "assumed_promotion_flag": promo,
                    })
                db.commit()
                del df
                gc.collect()

                total_units = sum(f["predicted_units_sold"] for f in forecast_results)
                avg_daily = total_units / max(1, horizon_days)
                day_totals = {}
                for f in forecast_results:
                    day_totals[f["forecast_date"]] = day_totals.get(f["forecast_date"], 0) + f["predicted_units_sold"]
                peak_day = max(day_totals.items(), key=lambda x: x[1])[0] if day_totals else None

                return {
                    "run_id": run.id,
                    "model_name": run.model_name,
                    "horizon_days": horizon_days,
                    "products_count": len(product_ids),
                    "total_predicted_units": round(total_units, 1),
                    "avg_daily_forecast": round(avg_daily, 1),
                    "highest_demand_day": peak_day,
                    "forecasts": forecast_results,
                    "status": "completed",
                }

        # If model failed due to OOM on custom workspace, give an explicit actionable error
        if not self.model_loaded and self.load_error and "Out of memory" in self.load_error:
            raise ValueError(
                "The server reached memory capacity (512 MB) attempting to load the ML model. "
                "Additional RAM is required on the host instance."
            )

        # Live inference execution path
        products = db.query(Product).filter(
            Product.workspace_id == workspace_id,
            Product.product_id.in_(product_ids)
        ).all()
        prod_map = {p.product_id: p for p in products}

        # Check historical sales data - bound query to recent history (max 60 days per product)
        # to prevent loading tens of thousands of rows into memory
        max_lookback = 60
        sales_records = (
            db.query(SalesRecord)
            .filter(
                SalesRecord.workspace_id == workspace_id,
                SalesRecord.product_id.in_(product_ids)
            )
            .order_by(SalesRecord.date.desc())
            .limit(len(product_ids) * max_lookback)
            .all()
        )
        sales_records = sorted(sales_records, key=lambda r: r.date)

        if not sales_records:
            raise ValueError(
                "No historical sales data found for the selected products in this workspace. "
                "Please upload sales records with daily dates and units sold."
            )

        df_sales = pd.DataFrame([{
            "product_id": r.product_id,
            "date": pd.to_datetime(r.date),
            "units_sold": float(r.units_sold or 0.0),
            "unit_price": float(r.unit_price or 50.0),
        } for r in sales_records])

        model_label = "Extra Trees Regressor" if self.model_loaded else "Adaptive Baseline (Model Unavailable)"
        run = ForecastRun(
            workspace_id=workspace_id,
            model_name=model_label,
            horizon_days=horizon_days,
            products_count=len(product_ids),
            status="completed",
        )
        db.add(run)
        db.flush()

        forecast_results = []

        for pid in product_ids:
            p_obj = prod_map.get(pid)
            p_name = p_obj.product_name if p_obj else pid
            p_cat = p_obj.category if p_obj else "General"
            p_price = p_obj.unit_price if (p_obj and p_obj.unit_price) else 50.0

            sub = df_sales[df_sales["product_id"] == pid].sort_values("date")
            if len(sub) == 0:
                continue

            last_date = sub["date"].max().date()
            # Build rolling historical units series
            hist_units = list(sub["units_sold"].values)
            recent_avg = float(sub["units_sold"].tail(14).mean()) or 10.0

            # Recursive forecast loop
            for h in range(1, horizon_days + 1):
                cur_date = last_date + timedelta(days=h)
                lag_1 = hist_units[-1] if len(hist_units) >= 1 else recent_avg
                lag_7 = hist_units[-7] if len(hist_units) >= 7 else lag_1
                lag_28 = hist_units[-28] if len(hist_units) >= 28 else lag_7
                rolling_7 = sum(hist_units[-7:]) / min(len(hist_units), 7)
                rolling_28 = sum(hist_units[-28:]) / min(len(hist_units), 28)

                pred_val = recent_avg
                # Live inference with the Extra Trees pipeline
                if self.model_loaded and self.model is not None:
                    row_data = pd.DataFrame([{
                        "product_id": pid,
                        "category": p_cat,
                        "unit_price": p_price,
                        "discount_pct": 0.0,
                        "promotion_flag": 0,
                        "dayofweek": cur_date.weekday(),
                        "month": cur_date.month,
                        "dayofyear": cur_date.timetuple().tm_yday,
                        "is_weekend": 1 if cur_date.weekday() >= 5 else 0,
                        "lag_1": lag_1,
                        "lag_7": lag_7,
                        "lag_28": lag_28,
                        "rolling_mean_7": rolling_7,
                        "rolling_mean_28": rolling_28,
                    }])
                    try:
                        p_pred = self.model.predict(row_data)
                        pred_val = max(0.0, float(p_pred[0]))
                    except Exception as inf_err:
                        logger.error("Live model prediction failed for %s on %s: %s", pid, cur_date, inf_err)
                        dow_mult = 1.3 if cur_date.weekday() >= 5 else 0.95
                        pred_val = max(1.0, round(rolling_7 * dow_mult, 1))
                else:
                    logger.warning("Live model unavailable during forecast. Using adaptive time-series fallback.")
                    dow_mult = 1.3 if cur_date.weekday() >= 5 else 0.95
                    pred_val = max(1.0, round(rolling_7 * dow_mult, 1))

                # Append recursive output to series
                hist_units.append(pred_val)

                res = ForecastResult(
                    workspace_id=workspace_id,
                    run_id=run.id,
                    product_id=pid,
                    forecast_date=cur_date,
                    predicted_units_sold=round(pred_val, 1),
                    assumed_unit_price=p_price,
                    assumed_discount_pct=0.0,
                    assumed_promotion_flag=0,
                )
                db.add(res)
                forecast_results.append({
                    "product_id": pid,
                    "product_name": p_name,
                    "category": p_cat,
                    "forecast_date": str(cur_date),
                    "predicted_units_sold": round(pred_val, 1),
                    "assumed_unit_price": p_price,
                    "assumed_discount_pct": 0.0,
                    "assumed_promotion_flag": 0,
                })

        del df_sales
        import gc
        gc.collect()

        db.commit()

        total_units = sum(f["predicted_units_sold"] for f in forecast_results)
        avg_daily = total_units / max(1, horizon_days)
        day_totals = {}
        for f in forecast_results:
            day_totals[f["forecast_date"]] = day_totals.get(f["forecast_date"], 0) + f["predicted_units_sold"]
        peak_day = max(day_totals.items(), key=lambda x: x[1])[0] if day_totals else None

        return {
            "run_id": run.id,
            "model_name": run.model_name,
            "horizon_days": horizon_days,
            "products_count": len(product_ids),
            "total_predicted_units": round(total_units, 1),
            "avg_daily_forecast": round(avg_daily, 1),
            "highest_demand_day": peak_day,
            "forecasts": forecast_results,
            "status": "completed",
        }


# Singleton instance
model_service = ModelService()
