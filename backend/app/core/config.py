"""Application configuration loaded from environment variables."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Application
    app_name: str = "RetailIQ"
    app_version: str = "1.0.0"
    environment: str = "development"

    # Database
    database_url: str = "sqlite:///./retailiq.db"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # ML Model
    model_dir: str = "app/models"

    # Upload
    max_upload_size_mb: int = 50

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def model_artifacts_path(self) -> Path:
        return Path(self.model_dir)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
