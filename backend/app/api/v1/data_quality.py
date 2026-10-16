"""
Data Quality API endpoints for QueryTrust AI.

Implements:
- GET /api/v1/data-quality/summary: Retrieve latest profiling run summary
- POST /api/v1/data-quality/run: Trigger new data quality profiling run (Analyst, Admin)
- GET /api/v1/data-quality/findings: Paginated, filterable findings from latest run
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.user import User
from app.models.data_quality import DataQualityRun, DataQualityFinding
from app.core.auth import get_current_user
from app.core.data_quality import DataQualityProfiler
from app.schemas.data_quality import (
    DataQualityRunSummary,
    DataQualityRunResponse,
    DataQualityFindingItem,
    DataQualityFindingsResponse,
)

logger = logging.getLogger("querytrust.api.data_quality")
router = APIRouter(prefix="/data-quality", tags=["Data Quality"])


def _to_run_summary(run: DataQualityRun) -> DataQualityRunSummary:
    """Helper to convert DataQualityRun ORM model to response summary schema."""
    summary_data = run.summary_json or {}
    return DataQualityRunSummary(
        id=run.id,
        triggered_by=run.triggered_by,
        status=run.status,
        total_findings=run.total_findings,
        critical_count=summary_data.get("critical_count", 0),
        high_count=summary_data.get("high_count", 0),
        medium_count=summary_data.get("medium_count", 0),
        low_count=summary_data.get("low_count", 0),
        total_records_analyzed=summary_data.get("total_records_analyzed", 0),
        overall_health_score=summary_data.get("overall_health_score", 100.0),
        created_at=run.created_at,
        completed_at=run.completed_at,
    )


def _to_finding_item(f: DataQualityFinding, total_devices: int = 5000) -> DataQualityFindingItem:
    """Helper to convert DataQualityFinding ORM model to finding schema."""
    rule_id = f.rule_name.split(":")[0].strip() if ":" in f.rule_name else "DQ"
    rule_name = f.rule_name.split(":")[1].strip() if ":" in f.rule_name else f.rule_name

    return DataQualityFindingItem(
        id=f.id,
        run_id=f.run_id,
        table_name=f.table_name,
        column_name=f.column_name,
        rule_id=rule_id,
        rule_name=rule_name,
        severity=f.severity,
        affected_rows=f.affected_rows,
        total_rows=total_devices if f.table_name == "devices" else 25000,
        affected_percentage=f.affected_percentage,
        example_identifiers=f.example_identifiers or [],
        suggested_action=f.suggested_action or "Review and normalize data.",
        created_at=f.created_at,
    )


@router.get("/summary", response_model=DataQualityRunSummary)
def get_data_quality_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves the summary of the latest completed Data Quality profiling run.

    If no run exists yet, initiates an initial baseline profiling run automatically.
    """
    latest_run = (
        db.query(DataQualityRun)
        .filter(DataQualityRun.status == "completed")
        .order_by(desc(DataQualityRun.created_at))
        .first()
    )

    if not latest_run:
        logger.info("No prior data quality runs found. Running baseline profiling...")
        profiler = DataQualityProfiler(db)
        latest_run = profiler.run_all_checks(triggered_by_user_id=current_user.id)

    return _to_run_summary(latest_run)


@router.post("/run", response_model=DataQualityRunResponse)
def trigger_data_quality_run(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Triggers an on-demand data quality diagnostic run across database inventory.

    Restricted to Analyst and Admin roles.
    """
    if current_user.role not in ["analyst", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Analyst and Admin users are authorized to trigger data quality profiling.",
        )

    # The partial unique index on status='running' is the server-side race
    # guard. It protects direct API callers in addition to disabled UI buttons.
    if db.query(DataQualityRun).filter(DataQualityRun.status == "running").first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A data quality profiling run is already in progress. Refresh shortly for its result.",
        )

    profiler = DataQualityProfiler(db)
    try:
        run = profiler.run_all_checks(triggered_by_user_id=current_user.id)
    except IntegrityError as exc:
        db.rollback()
        logger.info("Rejected concurrent data quality profiling request")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A data quality profiling run is already in progress. Refresh shortly for its result.",
        ) from exc

    findings = (
        db.query(DataQualityFinding)
        .filter(DataQualityFinding.run_id == run.id)
        .order_by(
            # Sort critical first, then high, medium, low
            desc(DataQualityFinding.severity == "critical"),
            desc(DataQualityFinding.severity == "high"),
            desc(DataQualityFinding.severity == "medium"),
            DataQualityFinding.affected_percentage.desc(),
        )
        .all()
    )

    return DataQualityRunResponse(
        summary=_to_run_summary(run),
        findings=[_to_finding_item(f) for f in findings],
    )


@router.get("/findings", response_model=DataQualityFindingsResponse)
def get_data_quality_findings(
    severity: Optional[str] = Query(None, description="Filter by severity: critical, high, medium, low"),
    table_name: Optional[str] = Query(None, description="Filter by table name: devices, telemetry_readings"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves paginated findings from the latest completed data quality run."""
    latest_run = (
        db.query(DataQualityRun)
        .filter(DataQualityRun.status == "completed")
        .order_by(desc(DataQualityRun.created_at))
        .first()
    )

    if not latest_run:
        # Run baseline if none exists
        profiler = DataQualityProfiler(db)
        latest_run = profiler.run_all_checks(triggered_by_user_id=current_user.id)

    query = db.query(DataQualityFinding).filter(DataQualityFinding.run_id == latest_run.id)

    if severity:
        query = query.filter(DataQualityFinding.severity == severity.lower().strip())
    if table_name:
        query = query.filter(DataQualityFinding.table_name == table_name.lower().strip())

    total = query.count()
    offset = (page - 1) * limit

    findings = (
        query.order_by(
            desc(DataQualityFinding.severity == "critical"),
            desc(DataQualityFinding.severity == "high"),
            desc(DataQualityFinding.severity == "medium"),
            DataQualityFinding.affected_percentage.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return DataQualityFindingsResponse(
        total=total,
        page=page,
        limit=limit,
        findings=[_to_finding_item(f) for f in findings],
    )
