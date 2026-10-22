export interface WorkspaceOut {
  workspace_id: string;
  session_token: string;
  name: string;
  is_sample: boolean;
  created_at: string;
  expires_at: string;
}

export interface WorkspaceStatusResponse {
  workspace_id: string;
  name: string;
  is_sample: boolean;
  created_at: string;
  expires_at: string;
  days_until_expiry: number;
  has_data: boolean;
  products_count: number;
  sales_count: number;
  forecast_runs_count: number;
}

export interface ExcelSheetsResponse {
  filename: string;
  is_excel: boolean;
  sheets: string[];
  default_sheet?: string;
}

export interface ProductUpdateInput {
  product_name?: string;
  category?: string;
  unit_price?: number;
  current_stock?: number;
  supplier_lead_time_days?: number;
  safety_stock_units?: number;
}

export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  database: string;
  model: string;
  environment: string;
  timestamp: string;
}

export interface DashboardSummary {
  has_data?: boolean;
  total_units_sold: number;
  total_revenue: number;
  total_products: number;
  total_categories: number;
  low_stock_count: number;
  data_date_range?: {
    start: string;
    end: string;
  };
  monthly_sales: Array<{ month: string; units_sold: number }>;
  revenue_trend: Array<{ month: string; revenue: number }>;
  category_performance: Array<{ category: string; units_sold: number; revenue: number }>;
  top_products: Array<{
    product_id: string;
    product_name: string;
    category: string;
    total_units: number;
    total_revenue: number;
  }>;
  reorder_alerts: Array<{
    product_id: string;
    product_name: string;
    category: string;
    current_stock: number;
    safety_stock: number;
    recommended_order_quantity: number;
    lead_time_days: number;
  }>;
  data_source: string;
}

export interface SalesAnalytics {
  daily_sales: Array<{ date: string; units_sold: number; revenue: number }>;
  monthly_sales: Array<{ month: string; units_sold: number; revenue: number }>;
  revenue_trends: Array<{ month: string; revenue: number; units_sold: number }>;
  product_rankings: Array<{
    product_id: string;
    product_name: string;
    total_units: number;
    total_revenue: number;
  }>;
  category_comparison: Array<{
    category: string;
    total_units: number;
    total_revenue: number;
    avg_discount: number;
  }>;
  day_of_week_patterns: Array<{
    dayofweek: string;
    avg_units: number;
    total_units: number;
  }>;
  discount_analysis: Array<{
    has_discount: string;
    avg_units: number;
    total_revenue: number;
    count: number;
  }>;
}

export interface Product {
  product_id: string;
  product_name: string;
  category: string;
  unit_price?: number;
  current_stock?: number;
  supplier_lead_time_days?: number;
  safety_stock_units?: number;
}

export interface ForecastRequest {
  product_ids: string[];
  horizon_days: number;
}

export interface ForecastResultItem {
  product_id: string;
  product_name?: string;
  category?: string;
  forecast_date: string;
  predicted_units_sold: number;
  assumed_unit_price?: number;
  assumed_discount_pct?: number;
  assumed_promotion_flag?: number;
}

export interface ForecastResponse {
  run_id?: number;
  model_name: string;
  horizon_days: number;
  products_count: number;
  total_predicted_units: number;
  forecasts: ForecastResultItem[];
  status: string;
  message?: string;
  data_source: string;
}

export interface InventoryRecommendation {
  product_id: string;
  product_name: string;
  category: string;
  current_stock: number;
  lead_time_days: number;
  forecast_demand_during_lead_time: number;
  safety_stock_units: number;
  recommended_order_quantity: number;
  status: 'Healthy' | 'Low Stock' | 'Reorder Required' | 'Out of Stock' | string;
  priority: number;
  suggested_action?: string;
  recommendation?: string;
}

export interface InventoryResponse {
  recommendations: InventoryRecommendation[];
  total_products?: number;
  reorder_required_count?: number;
  low_stock_count?: number;
  out_of_stock_count?: number;
  healthy_count?: number;
  last_updated?: string;
  formula_note?: string;
  data_source?: string;
}

export interface ModelMetricsResponse {
  best_model?: string;
  target?: string;
  train_start?: string;
  train_end?: string;
  test_start?: string;
  test_end?: string;
  mae?: number;
  rmse?: number;
  r2?: number;
  data_source?: string;
  forecast_horizon_days?: number;
  model_comparison: Array<{
    model: string;
    MAE: number;
    RMSE: number;
    R2: number;
  }>;
  model_loaded: boolean;
  message?: string;
}

export interface DataPreviewResponse {
  filename: string;
  file_size_bytes: number;
  total_rows: number;
  columns: string[];
  preview_rows: Array<Record<string, any>>;
  missing_values: Record<string, number>;
  duplicate_count: number;
  required_columns_present: string[];
  missing_required_columns: string[];
  warnings: string[];
  valid: boolean;
}

export interface DataImportResponse {
  import_id?: number;
  filename: string;
  status: string;
  rows_total: number;
  rows_imported: number;
  rows_skipped: number;
  rows_errors: number;
  error_message?: string;
  message: string;
}

export interface DataImportHistory {
  id: number;
  filename: string;
  file_size_bytes?: number;
  rows_total?: number;
  rows_imported?: number;
  rows_skipped?: number;
  status: string;
  imported_at: string;
}
