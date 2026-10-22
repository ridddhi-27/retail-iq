-- RetailIQ Database Schema (Multi-User Workspace Isolated)
-- Target: PostgreSQL (compatible with SQLite for local development)
-- Every user operates in an isolated workspace with a secure session token.

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id SERIAL PRIMARY KEY,
    workspace_id VARCHAR(64) UNIQUE NOT NULL,
    session_token VARCHAR(128) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL DEFAULT 'My Workspace',
    is_sample BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_workspaces_token ON workspaces(session_token);
CREATE INDEX IF NOT EXISTS ix_workspaces_ws_id ON workspaces(workspace_id);

-- Products master table (scoped to workspace)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit_price FLOAT,
    current_stock FLOAT DEFAULT 0,
    supplier_lead_time_days INTEGER DEFAULT 5,
    safety_stock_units FLOAT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_workspace_product UNIQUE (workspace_id, product_id)
);

CREATE INDEX IF NOT EXISTS ix_products_ws_id ON products(workspace_id);
CREATE INDEX IF NOT EXISTS ix_products_product_id ON products(product_id);
CREATE INDEX IF NOT EXISTS ix_products_category ON products(category);

-- Daily sales records (scoped to workspace)
CREATE TABLE IF NOT EXISTS sales_records (
    id SERIAL PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    units_sold FLOAT NOT NULL DEFAULT 0,
    unit_price FLOAT,
    discount_pct FLOAT DEFAULT 0,
    promotion_flag INTEGER DEFAULT 0,
    revenue FLOAT,
    stock_on_hand_end_of_day FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_workspace_product_date UNIQUE (workspace_id, product_id, date)
);

CREATE INDEX IF NOT EXISTS ix_sales_ws_id ON sales_records(workspace_id);
CREATE INDEX IF NOT EXISTS ix_sales_date ON sales_records(date);
CREATE INDEX IF NOT EXISTS ix_sales_ws_date ON sales_records(workspace_id, date);
CREATE INDEX IF NOT EXISTS ix_sales_ws_prod ON sales_records(workspace_id, product_id);

-- Forecast run metadata (scoped to workspace)
CREATE TABLE IF NOT EXISTS forecast_runs (
    id SERIAL PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    run_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    model_name VARCHAR(100),
    horizon_days INTEGER NOT NULL DEFAULT 30,
    products_count INTEGER,
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_forecast_runs_ws_id ON forecast_runs(workspace_id);
CREATE INDEX IF NOT EXISTS ix_forecast_runs_run_date ON forecast_runs(run_date);

-- Individual forecast results (scoped to workspace)
CREATE TABLE IF NOT EXISTS forecast_results (
    id SERIAL PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    run_id INTEGER NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL,
    forecast_date DATE NOT NULL,
    predicted_units_sold FLOAT NOT NULL,
    assumed_unit_price FLOAT,
    assumed_discount_pct FLOAT,
    assumed_promotion_flag INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_forecast_results_ws_id ON forecast_results(workspace_id);
CREATE INDEX IF NOT EXISTS ix_forecast_results_run_id ON forecast_results(run_id);
CREATE INDEX IF NOT EXISTS ix_forecast_results_ws_prod_date ON forecast_results(workspace_id, product_id, forecast_date);

-- Data import history (scoped to workspace)
CREATE TABLE IF NOT EXISTS data_imports (
    id SERIAL PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    file_size_bytes INTEGER,
    rows_total INTEGER DEFAULT 0,
    rows_imported INTEGER DEFAULT 0,
    rows_skipped INTEGER DEFAULT 0,
    rows_errors INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_data_imports_ws_id ON data_imports(workspace_id);
