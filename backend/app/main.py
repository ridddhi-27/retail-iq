"""
RetailIQ — AI-Powered Retail Demand Forecasting & Inventory Intelligence

Main FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import init_db
from app.api.routes import router
from app.services.model_service import model_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("Starting RetailIQ v%s (%s)", settings.app_version, settings.environment)

    # Initialize database tables
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized (%s)", "SQLite" if settings.is_sqlite else "PostgreSQL")

    # Discover and initialize ML model artifacts in memory-efficient mode
    artifacts_dir = model_service.discover_artifacts_dir(
        explicit_path=settings.model_path or settings.model_dir
    )

    if artifacts_dir:
        logger.info("Discovered ML model artifacts at: %s", artifacts_dir)
        model_service.artifacts_dir = artifacts_dir
        model_service.initialize()
    else:
        logger.error(
            "CRITICAL: retailiq_model.joblib not found in any candidate locations (model_dir=%s, cwd=%s)",
            settings.model_dir, Path.cwd()
        )
        model_service.load_error = "Model artifact retailiq_model.joblib not found in searched locations."

    status = model_service.get_status()
    logger.info("Model status: %s", status)

    yield

    logger.info("Shutting down RetailIQ")


# Create FastAPI application
app = FastAPI(
    title="RetailIQ API",
    description=(
        "AI-Powered Retail Demand Forecasting & Inventory Intelligence Platform. "
        "All data is from a DB Mart-inspired synthetic dataset and does not represent actual store records."
    ),
    version=settings.app_version,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(router, prefix="/api")
