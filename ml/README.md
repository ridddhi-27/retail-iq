# RetailIQ Machine Learning Architecture & Artifacts

## Overview
RetailIQ uses an ensemble **Extra Trees Regressor** (`ExtraTreesRegressor`) model trained in Google Colab to forecast retail demand and predict dynamic safety stock units.

## Exported Colab Artifacts
The following artifacts are exported directly from the training notebook and located in the workspace root / model directory:
- `retailiq_model.joblib`: Fitted Scikit-Learn `Pipeline` (~358 MB) containing numerical imputers, one-hot encoders, and the Extra Trees estimator.
- `feature_columns.json`: The 14 exact ordered input features expected by the pipeline.
- `metrics.json`: Final benchmark evaluation metrics computed on the 2025 temporal holdout test split.
- `forecast_30_days.csv`: Precomputed 30-day recursive daily forecast for all 30 products (900 rows).
- `inventory_recommendations.csv`: Precomputed replenishment decisions matching the formula.
- `model_comparison.csv`: Head-to-head comparison against Random Forest and a median dummy baseline.

## Feature Engineering Protocol
The 14 features used during model training and inference:
1. `product_id`: Unique SKU identifier (e.g., P001 to P030).
2. `category`: Product category (Staples, Beverages, Personal Care, Dairy, etc.).
3. `unit_price`: Baseline retail selling price.
4. `discount_pct`: Percentage discount applied.
5. `promotion_flag`: Binary indicator (1 if promoted, 0 otherwise).
6. `dayofweek`: Day of week index (0=Monday ... 6=Sunday).
7. `month`: Month index (1-12).
8. `dayofyear`: Calendar day of year (1-365).
9. `is_weekend`: Binary flag (1 for Saturday/Sunday).
10. `lag_1`: Sales volume 1 day prior.
11. `lag_7`: Sales volume 7 days prior.
12. `lag_28`: Sales volume 28 days prior.
13. `rolling_mean_7`: 7-day rolling window average sales volume.
14. `rolling_mean_28`: 28-day rolling window average sales volume.

> **Critical Rule**: All lag and rolling aggregations use strictly past observations to prevent target data leakage. Future promotion flags and discounts during forecasting are exposed transparently as assumed baselines.

## Benchmark Performance (Test Set: 2025-01-01 to 2025-12-31)
- **Champion Model**: Extra Trees Regressor
- **MAE**: 9.417 units
- **RMSE**: 13.385 units
- **R² Score**: 0.679 (67.9% variance explained)
- **Training Window**: 2020-01-29 to 2024-12-31 (5 Years)
- **Baseline Comparison**: Outperformed Median Baseline (MAE 17.52, R² -0.10) and Random Forest (MAE 9.50, R² 0.674).

## Synthetic Data Disclosure
All training data was generated based on DB Mart retail patterns. Metrics represent synthetic benchmark results and should not be construed as real DB Mart corporate performance.
