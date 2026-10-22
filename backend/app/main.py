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

    # Load ML model artifacts
    # Look for artifacts in the workspace root first, then model_dir
    workspace_root = Path(__file__).resolve().parent.parent.parent  # retail-iq/
    artifacts_dir = workspace_root  # The ML files are in the project root
    model_dir = Path(settings.model_dir)

    if (model_dir / "retailiq_model.joblib").exists():
        artifacts_dir = model_dir
    elif (workspace_root / "retailiq_model.joblib").exists():
        artifacts_dir = workspace_root
    else:
        logger.warning("Model artifacts not found in %s or %s", model_dir, workspace_root)

    logger.info("Loading ML artifacts from: %s", artifacts_dir)
    model_service.artifacts_dir = artifacts_dir
    model_service.load_all()

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
