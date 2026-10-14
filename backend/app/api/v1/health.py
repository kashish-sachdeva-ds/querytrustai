from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.config import get_settings, Settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health & Readiness"])


@router.get("/health", response_model=HealthResponse)
def get_health(settings: Settings = Depends(get_settings)):
    """Liveness probe: verifies application process is running."""
    return HealthResponse(
        status="ok",
        version="0.1.0",
        environment=settings.ENVIRONMENT,
        llm_provider=settings.LLM_PROVIDER,
        database="unknown",
    )


@router.get("/ready", response_model=HealthResponse)
def get_ready(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Readiness probe: verifies database connectivity and core services."""
    try:
        # Check primary database
        result = db.execute(text("SELECT 1")).scalar()
        if result != 1:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database readiness check returned invalid result",
            )
        db_status = "connected"
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database readiness probe failed: {str(e)}",
        )

    return HealthResponse(
        status="ready",
        version="0.1.0",
        environment=settings.ENVIRONMENT,
        llm_provider=settings.LLM_PROVIDER,
        database=db_status,
        details={
            "app_name": settings.APP_NAME,
            "max_query_rows": settings.MAX_QUERY_ROWS,
            "timeout_seconds": settings.QUERY_TIMEOUT_SECONDS,
        },
    )
