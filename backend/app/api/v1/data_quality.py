"""
Data Quality API endpoints for QueryTrust AI.

Implements:
- GET /api/v1/data-quality/summary: Retrieve latest profiling run summary
- POST /api/v1/data-quality/run: Trigger new data quality profiling run (Analyst, Admin)
- GET /api/v1/data-quality/findings: Paginated, filterable findings from latest run
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.user import User
from app.models.data_source import DataSource
from app.models.data_quality import DataQualityRun, DataQualityFinding
from app.models.webhook import WebhookConfig
from app.services.webhook_dispatcher import dispatch_webhook
from app.core.auth import get_current_user, is_demo_workspace
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


from app.core.cache import ttl_cache

@router.get("/summary", response_model=DataQualityRunSummary)
def get_data_quality_summary(
    refresh: bool = Query(False, description="Bypass cache and force recalculation"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves the summary of the latest completed Data Quality profiling run.

    If no run exists yet, initiates an initial baseline profiling run automatically.
    """
    cache_key = f"dq_summary:{current_user.workspace_name}"
    if not refresh:
        cached_val = ttl_cache.get(cache_key)
        if cached_val is not None:
            return cached_val

    if not is_demo_workspace(current_user):
        active_ds = (
            db.query(DataSource)
            .filter(
                DataSource.workspace_name == (current_user.workspace_name or ""),
                DataSource.is_active == True,
            )
            .first()
        )
        if not active_ds:
            return DataQualityRunSummary(
                id=uuid.uuid4(),
                triggered_by=current_user.id,
                status="completed",
                total_findings=0,
                critical_count=0,
                high_count=0,
                medium_count=0,
                low_count=0,
                total_records_analyzed=0,
                overall_health_score=100.0,
                created_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc),
            )

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

    res = _to_run_summary(latest_run)
    ttl_cache.set(cache_key, res, ttl=60)
    return res


@router.post("/run", response_model=DataQualityRunResponse)
def trigger_data_quality_run(
    background_tasks: BackgroundTasks,
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

    # Automated alert webhook dispatch on data quality degradation
    summary_data = run.summary_json or {}
    critical_count = summary_data.get("critical_count", 0)
    workspace = current_user.workspace_name or "Default Workspace"
    webhook = (
        db.query(WebhookConfig)
        .filter(
            WebhookConfig.workspace_name == workspace,
            WebhookConfig.is_active == True,
            WebhookConfig.notify_on_data_quality == True,
        )
        .first()
    )
    if webhook and (critical_count > 0 or run.total_findings > 0):
        fields = [
            {"name": "Overall Health Score", "value": f"{summary_data.get('overall_health_score', 100):.1f}%"},
            {"name": "Critical Rule Violations", "value": str(critical_count)},
            {"name": "Total Findings", "value": str(run.total_findings)},
            {"name": "Records Profiled", "value": str(summary_data.get("total_records_analyzed", 0))},
        ]
        top_critical = [f for f in findings if f.severity == "critical"]
        if top_critical:
            fields.append({"name": "Top Failed Rule", "value": top_critical[0].rule_name})
            fields.append({"name": "Affected Entities", "value": str(top_critical[0].affected_count)})

        async def _dispatch_dq_alert():
            try:
                await dispatch_webhook(
                    url=webhook.url,
                    platform=webhook.platform,
                    alert_type="data_quality_degraded",
                    title=f"Data Quality Degradation Alert ({critical_count} critical violations)",
                    description=f"Automated diagnostic profiling detected {critical_count} critical data quality rule violations.",
                    fields=fields,
                    severity="critical" if critical_count > 0 else "warning",
                    secret_token=webhook.secret_token,
                )
            except Exception as dq_err:
                logger.warning(f"Background DQ webhook dispatch failed: {dq_err}")

        background_tasks.add_task(_dispatch_dq_alert)

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
    if not is_demo_workspace(current_user):
        active_ds = (
            db.query(DataSource)
            .filter(
                DataSource.workspace_name == (current_user.workspace_name or ""),
                DataSource.is_active == True,
            )
            .first()
        )
        if not active_ds:
            return DataQualityFindingsResponse(
                total=0,
                page=page,
                limit=limit,
                findings=[],
            )

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
