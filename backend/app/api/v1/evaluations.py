"""
Evaluation Lab API endpoints for QueryTrust AI.

Implements:
- GET /api/v1/evaluations: List past evaluation runs (Admin only)
- POST /api/v1/evaluations/run: Execute a benchmark run (Admin only)
- GET /api/v1/evaluations/{id}: Retrieve detailed evaluation run results (Admin only)
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User
from app.models.evaluation import EvaluationRun
from app.core.auth import get_current_user
from app.evaluation.benchmark_runner import BenchmarkRunner
from app.schemas.evaluations import (
    EvaluationRunResponse,
    EvaluationRunSummary,
    EvaluationRunRequest,
)

logger = logging.getLogger("querytrust.api.evaluations")
router = APIRouter(prefix="/evaluations", tags=["Evaluations"])


def _require_admin(user: User):
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Evaluation Lab is restricted to Admin users.",
        )


@router.get("", response_model=List[EvaluationRunSummary])
def list_evaluation_runs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists all past evaluation benchmark runs, ordered by start time descending."""
    _require_admin(current_user)

    runs = (
        db.query(EvaluationRun)
        .order_by(desc(EvaluationRun.started_at))
        .limit(50)
        .all()
    )

    return [
        EvaluationRunSummary(
            id=run.id,
            benchmark_name=run.benchmark_name,
            benchmark_version=run.benchmark_version,
            provider=run.provider,
            mode=run.mode,
            status=run.status,
            total_cases=run.total_cases,
            passed_cases=run.passed_cases,
            failed_cases=run.failed_cases,
            overall_pass_rate=round(run.passed_cases / max(run.total_cases, 1) * 100, 1),
            category_metrics=run.category_metrics or {},
            started_at=run.started_at,
            completed_at=run.completed_at,
        )
        for run in runs
    ]


@router.post("/run", response_model=EvaluationRunResponse)
async def execute_evaluation_run(
    payload: EvaluationRunRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Executes the curated benchmark suite against the configured LLM provider.

    Mode options:
    - 'guarded': Full AST validation pipeline (default)
    - 'baseline': LLM generation only, reports what AST *would* block but does not enforce
    """
    _require_admin(current_user)

    if payload.mode not in ("guarded", "baseline"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mode '{payload.mode}'. Must be 'guarded' or 'baseline'.",
        )

    try:
        runner = BenchmarkRunner(db=db)
        result = await runner.run_evaluation(
            triggered_by=current_user.id,
            mode=payload.mode,
        )
        return result
    except Exception as e:
        logger.error(f"Evaluation run failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation run failed: {str(e)}",
        )


@router.get("/{evaluation_id}")
def get_evaluation_detail(
    evaluation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves the summary and failure details of a specific evaluation run."""
    _require_admin(current_user)

    run = db.query(EvaluationRun).filter(EvaluationRun.id == evaluation_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evaluation run '{evaluation_id}' not found.",
        )

    return {
        "id": str(run.id),
        "benchmark_name": run.benchmark_name,
        "benchmark_version": run.benchmark_version,
        "provider": run.provider,
        "mode": run.mode,
        "status": run.status,
        "total_cases": run.total_cases,
        "passed_cases": run.passed_cases,
        "failed_cases": run.failed_cases,
        "overall_pass_rate": round(run.passed_cases / max(run.total_cases, 1) * 100, 1),
        "category_metrics": run.category_metrics or {},
        "failures_summary": run.failures_summary or [],
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
    }
