"""Database schema migration for workspace isolation."""

import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
import secrets

def migrate_database(db_path: str = "retailiq.db"):
    db_file = Path(db_path)
    if not db_file.exists():
        print(f"Database {db_path} does not exist yet. Will be created on init.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Create workspaces table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workspaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id VARCHAR(64) UNIQUE NOT NULL,
        session_token VARCHAR(128) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL DEFAULT 'My Workspace',
        is_sample BOOLEAN NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_workspaces_token ON workspaces(session_token);")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_workspaces_ws_id ON workspaces(workspace_id);")

    # Ensure sample workspace exists
    cursor.execute("SELECT id FROM workspaces WHERE workspace_id = 'sample-workspace'")
    if not cursor.fetchone():
        sample_token = "sample-token-" + secrets.token_urlsafe(16)
        expires = (datetime.utcnow() + timedelta(days=365)).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
        INSERT INTO workspaces (workspace_id, session_token, name, is_sample, expires_at)
        VALUES ('sample-workspace', ?, 'Sample Store Demo', 1, ?)
        """, (sample_token, expires))
        print("Created sample-workspace in workspaces table.")

    # 2. Add workspace_id column to tables if missing
    tables = ['products', 'sales_records', 'forecast_runs', 'forecast_results', 'data_imports']
    for table in tables:
        cursor.execute(f"PRAGMA table_info({table});")
        columns = [row[1] for row in cursor.fetchall()]
        if 'workspace_id' not in columns:
            print(f"Migrating table '{table}': adding workspace_id column...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN workspace_id VARCHAR(64) DEFAULT 'sample-workspace';")
            cursor.execute(f"UPDATE {table} SET workspace_id = 'sample-workspace' WHERE workspace_id IS NULL OR workspace_id = '';")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS ix_{table}_ws_id ON {table}(workspace_id);")

    conn.commit()
    conn.close()
    print("Database migration for workspace isolation completed successfully.")

if __name__ == "__main__":
    migrate_database()
