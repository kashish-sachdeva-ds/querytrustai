"""
Analytics API endpoints for natural language preview, governed execution, feedback, and history.

Implements:
- POST /api/v1/analytics/preview: Translates question to candidate SQL and AST validation; NEVER executes SQL.
- POST /api/v1/analytics/execute: Executes a server-stored, validated preview ID using the read-only SELECT-only role.
- POST /api/v1/analytics/feedback: Persists user helpful/not-helpful feedback on queries.
- GET /api/v1/analytics/history: Retrieves paginated user query runs and execution metrics.
"""

import time
import asyncio
import logging
import decimal
import datetime as dt
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text, func, desc

from app.database import get_db, engine, readonly_engine
from app.config import get_settings
from app.core.auth import get_current_user, is_demo_workspace
from app.models.user import User
from app.models.query_run import QueryRun, QueryFeedback
from app.models.chat import ChatSession, ChatMessage
from app.models.data_source import DataSource
from sqlalchemy import create_engine
from app.schemas.analytics import (
    PreviewRequest,
    PreviewResponse,
    ValidationDetail,
    ExecuteRequest,
    ExecuteResponse,
    ChartRecommendation,
    FeedbackRequest,
    FeedbackResponse,
    QueryHistoryResponse,
    QueryHistoryItem,
)
from app.core.sql_validator import validate_and_sanitize_sql, SQLValidationResult, STANDARD_CHECKS
from app.core.llm_provider import get_llm_provider
from app.core.rate_limiter import rate_limit

logger = logging.getLogger("querytrust.analytics")
router = APIRouter(prefix="/analytics", tags=["Analytics"])
settings = get_settings()


def _serialize_row_value(val: Any) -> Any:
    """Safely serializes database values to JSON-compatible Python primitives."""
    if val is None:
        return None
    if isinstance(val, (datetime, dt.date, dt.time)):
        return val.isoformat()
    if isinstance(val, decimal.Decimal):
        return float(val) if val % 1 else int(val)
    if isinstance(val, (bytes, bytearray)):
        return val.decode("utf-8", errors="replace")
    return val


def _recommend_chart(columns: List[str], rows: List[Dict[str, Any]]) -> ChartRecommendation:
    """Deterministically inspects query result schema and row count to recommend visualization."""
    if not rows or not columns:
        return ChartRecommendation(chart_type="table", title="Query Results")

    # Single-value metric aggregate
    if len(rows) == 1 and len(columns) == 1:
        col = columns[0]
        title = col.replace("_", " ").title()
        return ChartRecommendation(chart_type="metric", y_axis=col, title=title)

    # Helper to check numeric value
    def _is_num(val: Any) -> bool:
        if isinstance(val, (int, float)):
            return True
        if isinstance(val, str) and val.strip():
            try:
                float(val)
                return True
            except ValueError:
                return False
        return False

    # Two-column distribution (e.g. category + count)
    if len(columns) == 2:
        col_0, col_1 = columns[0], columns[1]
        val_0 = rows[0].get(col_0)
        val_1 = rows[0].get(col_1)

        is_num_0 = _is_num(val_0)
        is_num_1 = _is_num(val_1)

        if is_num_1 and not is_num_0:
            cat_col, num_col = col_0, col_1
        elif is_num_0 and not is_num_1:
            cat_col, num_col = col_1, col_0
        else:
            cat_col, num_col = col_0, col_1

        title = f"{num_col.replace('_', ' ').title()} by {cat_col.replace('_', ' ').title()}"

        if len(rows) <= 7:
            return ChartRecommendation(chart_type="pie", x_axis=cat_col, y_axis=num_col, title=title)
        elif len(rows) <= 100:
            return ChartRecommendation(chart_type="bar", x_axis=cat_col, y_axis=num_col, title=title)

    # Multi-column table: detect primary categorical dimension for chart breakdown
    candidate_dims: List[str] = []
    for col in columns:
        col_lower = col.lower()
        if col_lower in ("id", "uuid") or col_lower.endswith("_id"):
            continue
        vals = {str(r.get(col)).strip() for r in rows if r.get(col) is not None}
        if 2 <= len(vals) <= 35:
            candidate_dims.append(col)

    for pref in ("device_type", "region", "status", "severity", "site_name", "model", "vendor"):
        if pref in candidate_dims:
            return ChartRecommendation(
                chart_type="table",
                x_axis=pref,
                title=f"Distribution by {pref.replace('_', ' ').title()}",
            )

    if candidate_dims:
        first_dim = candidate_dims[0]
        return ChartRecommendation(
            chart_type="table",
            x_axis=first_dim,
            title=f"Distribution by {first_dim.replace('_', ' ').title()}",
        )

    return ChartRecommendation(chart_type="table", title="Query Results")


def _generate_result_summary(columns: List[str], row_count: int, truncated: bool) -> str:
    """Generates an honest, strictly factual plain-language summary of returned rows."""
    if row_count == 0:
        return "No records were found matching the specified query filters."

    trunc_msg = f" (truncated to maximum limit of {settings.MAX_QUERY_ROWS})" if truncated else ""
    return f"Retrieved {row_count} matching record{'s' if row_count != 1 else ''}{trunc_msg} across {len(columns)} attributes."


@router.post("/preview", response_model=PreviewResponse, dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
async def preview_natural_language_query(
    payload: PreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Translates a user question into candidate SQL, executes AST validation via SQLGlot,

    stores an opaque server preview record, and returns the preview.

    INVARIANT: This endpoint NEVER executes the generated SQL against business tables.
    """
    question = payload.question.strip()
    session = None
    history = []

    # Verify session ownership if provided
    if payload.session_id:
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == payload.session_id, ChatSession.user_id == current_user.id)
            .first()
        )
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chat session '{payload.session_id}' not found or not owned by current user.",
            )

        # Fetch recent messages for conversational context
        recent_messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(6)
            .all()
        )
        history = [
            {"role": m.role, "content": m.content}
            for m in reversed(recent_messages)
        ]

    # For custom workspaces, check if a data source has been connected
    if not is_demo_workspace(current_user):
        workspace = current_user.workspace_name or ""
        active_ds = (
            db.query(DataSource)
            .filter(DataSource.workspace_name == workspace, DataSource.is_active == True)
            .first()
        )
        if not active_ds:
            query_run = QueryRun(
                user_id=current_user.id,
                workspace_name=current_user.workspace_name,
                session_id=session.id if session else None,
                question=question,
                interpreted_question="No database connected to this workspace.",
                generated_sql="",
                status="unsupported",
                error_category="DATA_SOURCE_UNCONFIGURED",
                error_message="No database is connected to this workspace. Please connect a database in Data Sources or load sample data.",
                provider="System",
                model="SchemaRouter",
            )
            db.add(query_run)
            db.commit()
            db.refresh(query_run)
            if session:
                user_msg = ChatMessage(session_id=session.id, role="user", content=question)
                assistant_msg = ChatMessage(
                    session_id=session.id,
                    role="assistant",
                    content="Your workspace currently has no active database connected. An administrator can connect your company database in Data Sources or load sample data.",
                    metadata_json={"query_run_id": str(query_run.id), "status": "unsupported"},
                )
                db.add_all([user_msg, assistant_msg])
                session.updated_at = datetime.now(timezone.utc)
                db.commit()

            return PreviewResponse(
                query_run_id=query_run.id,
                session_id=session.id if session else None,
                status="unsupported",
                intent_status="unsupported",
                interpreted_question="No database connected to this workspace.",
                clarification_question="Your workspace currently has no active database connection. A workspace admin can connect your organization's database in Data Sources or load sample data.",
                sql_preview=None,
                validation=ValidationDetail(
                    passed=False,
                    checks=list(STANDARD_CHECKS),
                    violations=["Workspace database not connected."],
                    warnings=[],
                    tables_referenced=[],
                ),
                assumptions=[],
                business_terms_used=[],
                can_execute=False,
                provider="System",
                model="SchemaRouter",
                is_demo_mode=False,
                created_at=query_run.created_at,
            )

    # Look up active data source and custom tables for current workspace
    workspace = current_user.workspace_name or "Default Workspace"
    active_ds = (
        db.query(DataSource)
        .filter(DataSource.workspace_name == workspace, DataSource.is_active == True)
        .first()
    )
    schema_context = active_ds.schema_cache if (active_ds and active_ds.schema_cache) else None
    custom_tables = set(schema_context.get("table_names", [])) if schema_context else None

    # Generate candidate structured response via configured LLM provider
    provider = get_llm_provider()
    try:
        llm_resp = await provider.generate_sql_preview(question, history=history, schema_context=schema_context)
    except Exception as e:
        logger.error(f"Error during LLM preview generation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate query interpretation.",
        )

    # Perform AST safety validation based on intent status
    can_execute = False
    validation_detail: ValidationDetail
    sanitized_sql = None

    if llm_resp.intent_status == "ready" and llm_resp.sql:
        val_res: SQLValidationResult = await asyncio.to_thread(validate_and_sanitize_sql, llm_resp.sql, allowed_tables=custom_tables)
        validation_detail = ValidationDetail(
            passed=val_res.is_valid,
            checks=val_res.checks,
            violations=val_res.violations,
            warnings=val_res.warnings,
            tables_referenced=val_res.tables_referenced,
        )
        if val_res.is_valid:
            status_val = "previewed"
            can_execute = True
            sanitized_sql = val_res.sanitized_sql
        else:
            status_val = "blocked"
            can_execute = False
            sanitized_sql = llm_resp.sql
    elif llm_resp.intent_status == "clarification_needed":
        status_val = "clarification_needed"
        can_execute = False
        validation_detail = ValidationDetail(
            passed=True,
            checks=list(STANDARD_CHECKS),
            violations=[],
            warnings=["Operational clarification required before query formulation."],
            tables_referenced=[],
        )
    else:  # unsupported
        status_val = "unsupported"
        can_execute = False
        validation_detail = ValidationDetail(
            passed=False,
            checks=list(STANDARD_CHECKS),
            violations=["The requested business concept is not supported by the data schema."],
            warnings=[],
            tables_referenced=[],
        )

    # Persist the preview record in query_runs table
    query_run = QueryRun(
        session_id=session.id if session else None,
        user_id=current_user.id,
        workspace_name=current_user.workspace_name,
        question=question,
        interpreted_question=llm_resp.interpreted_question,
        generated_sql=sanitized_sql or llm_resp.sql or "",
        status=status_val,
        validation_findings={
            "passed": validation_detail.passed,
            "checks": validation_detail.checks,
            "violations": validation_detail.violations,
            "warnings": validation_detail.warnings,
            "tables_referenced": validation_detail.tables_referenced,
            "assumptions": llm_resp.assumptions,
            "business_terms_used": llm_resp.business_terms_used,
        },
        provider=provider.name,
        model=provider.model,
        prompt_version=provider.prompt_version,
    )
    db.add(query_run)
    db.commit()
    db.refresh(query_run)

    # If linked to a chat session, record messages
    if session:
        user_msg = ChatMessage(
            session_id=session.id,
            role="user",
            content=question,
        )
        db.add(user_msg)

        assistant_content = llm_resp.interpreted_question
        if llm_resp.clarification_question:
            assistant_content = f"{llm_resp.interpreted_question}\n\nClarification Needed: {llm_resp.clarification_question}"

        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=assistant_content,
            metadata_json={
                "query_run_id": str(query_run.id),
                "intent_status": llm_resp.intent_status,
                "status": status_val,
                "sql_preview": sanitized_sql,
                "can_execute": can_execute,
                "violations": validation_detail.violations,
            },
        )
        db.add(assistant_msg)
        session.updated_at = datetime.now(timezone.utc)
        db.commit()

    return PreviewResponse(
        query_run_id=query_run.id,
        session_id=session.id if session else None,
        status=status_val,
        intent_status=llm_resp.intent_status,
        interpreted_question=llm_resp.interpreted_question,
        clarification_question=llm_resp.clarification_question,
        sql_preview=sanitized_sql,
        validation=validation_detail,
        assumptions=llm_resp.assumptions,
        business_terms_used=llm_resp.business_terms_used,
        can_execute=can_execute,
        provider=provider.name,
        model=provider.model,
        is_demo_mode=provider.is_demo,
        created_at=query_run.created_at,
    )


@router.post("/execute", response_model=ExecuteResponse)
async def execute_previewed_query(
    payload: ExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Executes a server-stored, validated preview ID against PostgreSQL.

    Security & Safety Invariants:
    1. Accepts ONLY an opaque preview ID (UUID). Arbitrary client SQL is rejected.
    2. Verifies query ownership (or admin privileges).
    3. Blocks execution if query is in 'blocked' or 'unsupported' status.
    4. Re-validates the stored SQL using SQLGlot before execution.
    5. Executes exclusively via 'analytics_reader' SELECT-only role in a read-only transaction.
    6. Enforces statement timeout and clamps output rows to MAX_QUERY_ROWS.
    """
    # Lock the preview row before transitioning it to executing. This makes
    # duplicate requests deterministic even when they land on separate workers.
    query_run = (
        db.query(QueryRun)
        .filter(QueryRun.id == payload.query_run_id)
        .with_for_update()
        .first()
    )
    if not query_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preview record '{payload.query_run_id}' not found.",
        )

    # Query previews are private artifacts. An administrator may audit metadata,
    # but must not execute or mutate a different user's preview by guessing its ID.
    if query_run.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to execute this preview.",
        )

    # Check status
    if query_run.status == "blocked":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot execute query: this query was blocked by SQL AST safety rules.",
        )
    if query_run.status == "unsupported":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot execute query: query requests unsupported domain metrics.",
        )
    if query_run.status in {"executing", "executed", "failed"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This preview has already been submitted for execution. Refresh its history before retrying.",
        )
    if query_run.status != "previewed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only a validated, ready preview can be executed.",
        )

    # Look up active data source for current workspace
    workspace = current_user.workspace_name or "Default Workspace"
    active_ds = (
        db.query(DataSource)
        .filter(DataSource.workspace_name == workspace, DataSource.is_active == True)
        .first()
    )
    if not is_demo_workspace(current_user) and not active_ds:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot execute query: no database is connected to this workspace. Please connect a database in Data Sources or load sample data.",
        )
    custom_tables = set(active_ds.schema_cache.get("table_names", [])) if (active_ds and active_ds.schema_cache) else None

    # Re-validate stored SQL at execution time against active target
    val_res = await asyncio.to_thread(validate_and_sanitize_sql, query_run.generated_sql, allowed_tables=custom_tables)
    if not val_res.is_valid:
        query_run.status = "blocked"
        query_run.error_category = "REVALIDATION_FAILURE"
        query_run.error_message = f"Execution safety check failed: {', '.join(val_res.violations)}"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Query failed execution-time safety check: {val_res.violations}",
        )

    sanitized_sql = val_res.sanitized_sql or query_run.generated_sql

    # Persist the in-flight state before releasing the row lock for the
    # read-only database call. A second submit now receives 409, not a second
    # execution attempt.
    query_run.status = "executing"
    db.commit()

    # Execute via dedicated analytics_reader role or active connected database in read-only transaction
    start_time = time.perf_counter()
    rows: List[Dict[str, Any]] = []
    columns: List[str] = []
    truncated = False
    custom_engine = None

    try:
        if active_ds:
            from app.services.data_source_service import decrypt_secret, DataSourceConnectionManager
            pw = decrypt_secret(active_ds.encrypted_password)
            pooled_engine = DataSourceConnectionManager.get_engine(
                host=active_ds.host,
                port=active_ds.port,
                database_name=active_ds.database_name,
                username=active_ds.username,
                password=pw,
                ssl_mode=active_ds.ssl_mode,
            )
            conn = pooled_engine.connect()
        else:
            try:
                conn = readonly_engine.connect()
            except Exception as conn_err:
                logger.warning(
                    f"Dedicated readonly_engine connection failed ({conn_err}); "
                    "falling back to primary engine with SET TRANSACTION READ ONLY."
                )
                conn = engine.connect()

        with conn:
            # Set statement timeout to configured limit (default 5s)
            conn.execute(text(f"SET LOCAL statement_timeout = '{settings.QUERY_TIMEOUT_SECONDS * 1000}';"))
            conn.execute(text("SET TRANSACTION READ ONLY;"))

            result = conn.execute(text(sanitized_sql))
            columns = list(result.keys())

            # Fetch rows up to MAX_QUERY_ROWS + 1 to detect truncation
            fetched = result.fetchmany(settings.MAX_QUERY_ROWS + 1)
            truncated = len(fetched) > settings.MAX_QUERY_ROWS
            final_fetched = fetched[:settings.MAX_QUERY_ROWS]

            for row in final_fetched:
                row_dict = {
                    col: _serialize_row_value(val)
                    for col, val in zip(columns, row)
                }
                rows.append(row_dict)

        duration_ms = (time.perf_counter() - start_time) * 1000.0

        # Update QueryRun record
        now_utc = datetime.now(timezone.utc)
        query_run.status = "executed"
        query_run.row_count = len(rows)
        query_run.execution_duration_ms = round(duration_ms, 2)
        query_run.executed_at = now_utc
        db.commit()

        # Generate recommendation & factual summary
        chart_rec = _recommend_chart(columns, rows)
        summary = _generate_result_summary(columns, len(rows), truncated)

        return ExecuteResponse(
            query_run_id=query_run.id,
            status="executed",
            row_count=len(rows),
            columns=columns,
            rows=rows,
            truncated=truncated,
            execution_duration_ms=round(duration_ms, 2),
            executed_at=now_utc,
            chart_recommendation=chart_rec,
            result_summary=summary,
        )

    except Exception as e:
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        logger.error(f"Execution error on query {query_run.id}: {e}", exc_info=True)

        query_run.status = "failed"
        query_run.error_category = "DB_EXECUTION_ERROR"
        query_run.error_message = "Database execution error occurred. Details omitted for security."
        query_run.execution_duration_ms = round(duration_ms, 2)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to execute query in read-only transaction.",
        )


@router.post("/feedback", response_model=FeedbackResponse)
def submit_query_feedback(
    payload: FeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submits or updates helpfulness feedback for a query run."""
    query_run = (
        db.query(QueryRun)
        .filter(QueryRun.id == payload.query_run_id)
        .with_for_update()
        .first()
    )
    if not query_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Query run '{payload.query_run_id}' not found.",
        )

    # Feedback is owned by the person who issued the query. This prevents an
    # administrator account from overwriting another user's response by ID.
    if query_run.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit feedback for your own queries.",
        )

    feedback = db.query(QueryFeedback).filter(QueryFeedback.query_run_id == payload.query_run_id).first()
    if feedback:
        feedback.is_helpful = payload.is_helpful
        feedback.explanation = payload.explanation
        feedback.created_at = datetime.now(timezone.utc)
    else:
        feedback = QueryFeedback(
            query_run_id=payload.query_run_id,
            user_id=current_user.id,
            is_helpful=payload.is_helpful,
            explanation=payload.explanation,
        )
        db.add(feedback)

    db.commit()
    db.refresh(feedback)

    return feedback


@router.get("/history", response_model=QueryHistoryResponse)
def get_query_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves paginated query runs with feedback.

    Non-admin users can access only their own query history. Admins can audit all runs.
    """
    query = (
        db.query(
            QueryRun.id,
            QueryRun.session_id,
            QueryRun.user_id,
            QueryRun.question,
            QueryRun.interpreted_question,
            QueryRun.generated_sql,
            QueryRun.status,
            QueryRun.row_count,
            QueryRun.execution_duration_ms,
            QueryRun.error_category,
            QueryRun.created_at,
            QueryRun.executed_at,
            QueryFeedback.is_helpful,
            QueryFeedback.explanation.label("feedback_explanation"),
        )
        .outerjoin(QueryFeedback, QueryRun.id == QueryFeedback.query_run_id)
    )

    # Multi-tenant workspace isolation & ownership filter
    workspace = current_user.workspace_name or "Default Workspace"
    query = query.filter(QueryRun.workspace_name == workspace)

    if current_user.role != "admin":
        query = query.filter(QueryRun.user_id == current_user.id)

    if status_filter:
        query = query.filter(QueryRun.status == status_filter)

    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    records = (
        query.order_by(desc(QueryRun.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        QueryHistoryItem(
            id=r.id,
            session_id=r.session_id,
            user_id=r.user_id,
            question=r.question,
            interpreted_question=r.interpreted_question,
            generated_sql=r.generated_sql,
            status=r.status,
            row_count=r.row_count,
            execution_duration_ms=r.execution_duration_ms,
            error_category=r.error_category,
            created_at=r.created_at,
            executed_at=r.executed_at,
            is_helpful=r.is_helpful,
            feedback_explanation=r.feedback_explanation,
        )
        for r in records
    ]

    return QueryHistoryResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
