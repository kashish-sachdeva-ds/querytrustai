import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api.v1.health import router as health_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.auth import router as auth_router
from app.api.v1.devices import router as devices_router
from app.api.v1.sites import router as sites_router
from app.api.v1.admin import router as admin_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.chat import router as chat_router
from app.api.v1.data_quality import router as data_quality_router
from app.api.v1.anomalies import router as anomalies_router
from app.api.v1.evaluations import router as evaluations_router
from app.api.v1.data_sources import router as data_sources_router

from app.database import Base, engine
import app.models  # noqa: F401 - Register all models

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("querytrust.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from sqlalchemy import text
    from app.database import SessionLocal
    from app.models.user import User
    from app.core.security import get_password_hash

    logger.info(f"Starting {settings.APP_NAME} ({settings.ENVIRONMENT})")
    logger.info(f"LLM Provider mode: {settings.LLM_PROVIDER}")
    try:
        Base.metadata.create_all(bind=engine)
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_name VARCHAR(255) DEFAULT 'Default Workspace';"))
            conn.execute(text("ALTER TABLE query_runs ADD COLUMN IF NOT EXISTS workspace_name VARCHAR(128);"))
        logger.info("Database tables and columns verified and initialized.")

        # Ensure core demo users and active administrator account exist
        with SessionLocal() as db:
            admin_user = db.query(User).filter(User.email == "admin@querytrust.local").first()
            if not admin_user:
                db.add(User(
                    email="admin@querytrust.local",
                    display_name="System Administrator",
                    password_hash=get_password_hash("AdminPass123!"),
                    role="admin",
                    workspace_name="Default Workspace",
                    is_active=True,
                ))
                db.add(User(
                    email="analyst@querytrust.local",
                    display_name="Lead Data Analyst",
                    password_hash=get_password_hash("AnalystPass123!"),
                    role="analyst",
                    workspace_name="Default Workspace",
                    is_active=True,
                ))
                db.add(User(
                    email="viewer@querytrust.local",
                    display_name="Executive Viewer",
                    password_hash=get_password_hash("ViewerPass123!"),
                    role="viewer",
                    workspace_name="Default Workspace",
                    is_active=True,
                ))
                db.commit()
                logger.info("Default demo accounts verified.")

            deepanshu = db.query(User).filter(User.email == "deepanshu123@gmail.com").first()
            if not deepanshu:
                db.add(User(
                    email="deepanshu123@gmail.com",
                    display_name="Deepanshu Sharma",
                    password_hash=get_password_hash("Kashish123&!"),
                    role="admin",
                    workspace_name="Deepanshu private limited",
                    is_active=True,
                ))
                db.commit()
                logger.info("Administrator account deepanshu123@gmail.com provisioned.")
            else:
                deepanshu.password_hash = get_password_hash("Kashish123&!")
                deepanshu.workspace_name = "Deepanshu private limited"
                db.commit()

    except Exception as exc:
        logger.warning(f"Database schema auto-creation check skipped or deferred: {exc}")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    description="Full-stack natural language analytics workbench with governed SQL safety.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
origins = settings.cors_origin_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health probes (for load balancers and orchestrators)
app.include_router(health_router, prefix="", tags=["Health Probes"])

# Versioned API routes
app.include_router(health_router, prefix=settings.API_V1_PREFIX, tags=["Health Probes"])
app.include_router(auth_router, prefix=settings.API_V1_PREFIX, tags=["Authentication"])
app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX, tags=["Dashboard"])
app.include_router(devices_router, prefix=settings.API_V1_PREFIX, tags=["Devices"])
app.include_router(sites_router, prefix=settings.API_V1_PREFIX, tags=["Sites"])
app.include_router(admin_router, prefix=settings.API_V1_PREFIX, tags=["Administration"])
app.include_router(analytics_router, prefix=settings.API_V1_PREFIX, tags=["Analytics"])
app.include_router(chat_router, prefix=settings.API_V1_PREFIX, tags=["Chat"])
app.include_router(data_quality_router, prefix=settings.API_V1_PREFIX, tags=["Data Quality"])
app.include_router(anomalies_router, prefix=settings.API_V1_PREFIX, tags=["Anomalies"])
app.include_router(evaluations_router, prefix=settings.API_V1_PREFIX, tags=["Evaluations"])
app.include_router(data_sources_router, prefix=settings.API_V1_PREFIX, tags=["Data Sources"])


@app.get("/", tags=["Root"])
def root_info():
    return {
        "app": settings.APP_NAME,
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
        "ready": "/ready",
        "environment": settings.ENVIRONMENT,
        "llm_provider": settings.LLM_PROVIDER,
        "synthetic_data": True,
    }
