import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User
from app.models.data_source import DataSource
from app.core.auth import get_current_user, require_role
from app.schemas.data_source import (
    DataSourceCreate,
    DataSourceUpdate,
    DataSourceTestRequest,
    DataSourceTestResponse,
    DataSourcePublic,
    ActiveDataSourceResponse,
    DataSourceTableInfo,
    DataSourceColumnInfo,
)
from app.services.data_source_service import (
    encrypt_secret,
    decrypt_secret,
    test_database_connection,
    introspect_database_schema,
    sanitize_db_error,
)

logger = logging.getLogger("querytrust.api.data_sources")
router = APIRouter(prefix="/data-sources", tags=["Data Sources"])


def get_sandbox_schema_catalog() -> List[DataSourceTableInfo]:
    """Return structured schema definitions for the synthetic networking sandbox database."""
    return [
        DataSourceTableInfo(
            table_name="devices",
            columns=[
                DataSourceColumnInfo(name="id", data_type="integer", is_nullable=False),
                DataSourceColumnInfo(name="asset_tag", data_type="character varying(50)", is_nullable=False),
                DataSourceColumnInfo(name="device_type", data_type="character varying(50)", is_nullable=False),
                DataSourceColumnInfo(name="vendor", data_type="character varying(100)", is_nullable=False),
                DataSourceColumnInfo(name="model", data_type="character varying(100)", is_nullable=False),
                DataSourceColumnInfo(name="firmware_version", data_type="character varying(50)", is_nullable=False),
                DataSourceColumnInfo(name="site_id", data_type="integer", is_nullable=False),
                DataSourceColumnInfo(name="status", data_type="character varying(30)", is_nullable=False),
                DataSourceColumnInfo(name="installed_at", data_type="timestamp with time zone", is_nullable=False),
                DataSourceColumnInfo(name="warranty_expiry", data_type="timestamp with time zone", is_nullable=True),
                DataSourceColumnInfo(name="serial_number", data_type="character varying(100)", is_nullable=True),
            ],
            row_count_estimate=5000,
        ),
        DataSourceTableInfo(
            table_name="sites",
            columns=[
                DataSourceColumnInfo(name="id", data_type="integer", is_nullable=False),
                DataSourceColumnInfo(name="name", data_type="character varying(100)", is_nullable=False),
                DataSourceColumnInfo(name="site_code", data_type="character varying(20)", is_nullable=False),
                DataSourceColumnInfo(name="region", data_type="character varying(50)", is_nullable=False),
                DataSourceColumnInfo(name="timezone", data_type="character varying(50)", is_nullable=False),
            ],
            row_count_estimate=50,
        ),
        DataSourceTableInfo(
            table_name="service_events",
            columns=[
                DataSourceColumnInfo(name="id", data_type="integer", is_nullable=False),
                DataSourceColumnInfo(name="device_id", data_type="integer", is_nullable=False),
                DataSourceColumnInfo(name="event_type", data_type="character varying(50)", is_nullable=False),
                DataSourceColumnInfo(name="severity", data_type="character varying(20)", is_nullable=False),
                DataSourceColumnInfo(name="description", data_type="text", is_nullable=False),
                DataSourceColumnInfo(name="started_at", data_type="timestamp with time zone", is_nullable=False),
                DataSourceColumnInfo(name="resolved_at", data_type="timestamp with time zone", is_nullable=True),
            ],
            row_count_estimate=320,
        ),
        DataSourceTableInfo(
            table_name="telemetry_readings",
            columns=[
                DataSourceColumnInfo(name="id", data_type="integer", is_nullable=False),
                DataSourceColumnInfo(name="device_id", data_type="integer", is_nullable=False),
                DataSourceColumnInfo(name="recorded_at", data_type="timestamp with time zone", is_nullable=False),
                DataSourceColumnInfo(name="cpu_utilization_pct", data_type="double precision", is_nullable=False),
                DataSourceColumnInfo(name="memory_utilization_pct", data_type="double precision", is_nullable=False),
                DataSourceColumnInfo(name="temperature_celsius", data_type="double precision", is_nullable=False),
                DataSourceColumnInfo(name="packet_loss_pct", data_type="double precision", is_nullable=False),
                DataSourceColumnInfo(name="error_rate", data_type="double precision", is_nullable=False),
            ],
            row_count_estimate=25000,
        ),
    ]


def build_active_response(workspace: str, active_ds: Optional[DataSource]) -> ActiveDataSourceResponse:
    """Format ActiveDataSourceResponse with full table and column schema introspection."""
    if active_ds and active_ds.schema_cache:
        raw_tables = active_ds.schema_cache.get("tables", [])
        tables = active_ds.schema_cache.get("table_names", [t.get("table_name") for t in raw_tables])
        table_count = active_ds.schema_cache.get("table_count", len(tables))

        schema_details = [
            DataSourceTableInfo(
                table_name=t.get("table_name", ""),
                columns=[
                    DataSourceColumnInfo(
                        name=c.get("name", ""),
                        data_type=c.get("data_type", "unknown"),
                        is_nullable=bool(c.get("is_nullable", True)),
                    )
                    for c in t.get("columns", [])
                ],
                row_count_estimate=t.get("row_count_estimate"),
            )
            for t in raw_tables
        ]
        total_cols = active_ds.schema_cache.get(
            "column_count", sum(len(t.columns) for t in schema_details)
        )

        return ActiveDataSourceResponse(
            mode="connected",
            workspace_name=workspace,
            source_id=active_ds.id,
            name=active_ds.name,
            db_type=active_ds.db_type,
            host=active_ds.host,
            database_name=active_ds.database_name,
            table_count=table_count,
            column_count=total_cols,
            tables=tables,
            schema_details=schema_details,
            last_synced_at=active_ds.last_synced_at.isoformat() if active_ds.last_synced_at else None,
        )

    # Sandbox fallback
    sandbox_tables = get_sandbox_schema_catalog()
    return ActiveDataSourceResponse(
        mode="sandbox",
        workspace_name=workspace,
        source_id=None,
        name="Synthetic Networking Sandbox (PostgreSQL)",
        db_type="postgresql",
        host="localhost (Built-in)",
        database_name="querytrust",
        table_count=len(sandbox_tables),
        column_count=sum(len(t.columns) for t in sandbox_tables),
        tables=[t.table_name for t in sandbox_tables],
        schema_details=sandbox_tables,
        last_synced_at=None,
    )


@router.get("/active", response_model=ActiveDataSourceResponse)
def get_active_data_source(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the currently active data source for the caller's workspace.

    Returns whether the workspace is operating against the Demo Sandbox or a connected enterprise database,
    along with full schema and column definitions for Schema Explorer & Ask Data.
    """
    workspace = current_user.workspace_name or "Default Workspace"
    active_ds = (
        db.query(DataSource)
        .filter(DataSource.workspace_name == workspace, DataSource.is_active == True)
        .first()
    )
    return build_active_response(workspace, active_ds)


@router.get("", response_model=List[DataSourcePublic])
def list_data_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"])),
):
    """List all registered external data sources for the current workspace.

    Admin and Analyst access. Passwords are never returned.
    """
    workspace = current_user.workspace_name or "Default Workspace"
    sources = (
        db.query(DataSource)
        .filter(DataSource.workspace_name == workspace)
        .order_by(desc(DataSource.created_at))
        .all()
    )

    result = []
    for s in sources:
        tables = s.schema_cache.get("table_names", []) if s.schema_cache else []
        col_count = s.schema_cache.get("column_count", 0) if s.schema_cache else 0
        tbl_count = s.schema_cache.get("table_count", len(tables)) if s.schema_cache else 0
        result.append(
            DataSourcePublic(
                id=s.id,
                workspace_name=s.workspace_name,
                name=s.name,
                db_type=s.db_type,
                host=s.host,
                port=s.port,
                database_name=s.database_name,
                username=s.username,
                ssl_mode=s.ssl_mode,
                status=s.status,
                last_error=s.last_error,
                is_active=s.is_active,
                is_default=s.is_default,
                table_count=tbl_count,
                column_count=col_count,
                tables=tables,
                last_synced_at=s.last_synced_at,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
        )
    return result


@router.post("/test", response_model=DataSourceTestResponse)
def test_connection_candidate(
    payload: DataSourceTestRequest,
    current_admin: User = Depends(require_role("admin")),
):
    """Test connectivity to an external PostgreSQL database without saving credentials.

    Admin access only. Returns latency, version, and discovered tables.
    """
    return test_database_connection(payload)


@router.post("", response_model=DataSourcePublic, status_code=status.HTTP_201_CREATED)
def create_data_source(
    payload: DataSourceCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    """Connect and register a new external database for the organization.

    Admin access only. Immediately introspects schema and stores encrypted credentials.
    """
    workspace = current_admin.workspace_name or "Default Workspace"

    # Introspect schema to confirm validity
    schema_catalog = None
    initial_status = "connected"
    last_err = None
    try:
        schema_catalog = introspect_database_schema(
            host=payload.host,
            port=payload.port,
            database_name=payload.database_name,
            username=payload.username,
            password=payload.password,
            ssl_mode=payload.ssl_mode,
        )
    except Exception as exc:
        logger.warning(f"Failed to introspect schema for {payload.host}: {exc}")
        initial_status = "error"
        last_err = sanitize_db_error(exc)

    # Deactivate existing sources if requested
    if payload.set_as_active and initial_status == "connected":
        db.query(DataSource).filter(DataSource.workspace_name == workspace).update({"is_active": False})

    encrypted_pw = encrypt_secret(payload.password)
    now = datetime.now(timezone.utc)

    ds = DataSource(
        workspace_name=workspace,
        name=payload.name,
        db_type=payload.db_type,
        host=payload.host,
        port=payload.port,
        database_name=payload.database_name,
        username=payload.username,
        encrypted_password=encrypted_pw,
        ssl_mode=payload.ssl_mode,
        status=initial_status,
        last_error=last_err,
        is_active=(payload.set_as_active and initial_status == "connected"),
        is_default=False,
        schema_cache=schema_catalog,
        last_synced_at=now if schema_catalog else None,
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)

    tables = ds.schema_cache.get("table_names", []) if ds.schema_cache else []
    col_count = ds.schema_cache.get("column_count", 0) if ds.schema_cache else 0
    tbl_count = ds.schema_cache.get("table_count", len(tables)) if ds.schema_cache else 0

    return DataSourcePublic(
        id=ds.id,
        workspace_name=ds.workspace_name,
        name=ds.name,
        db_type=ds.db_type,
        host=ds.host,
        port=ds.port,
        database_name=ds.database_name,
        username=ds.username,
        ssl_mode=ds.ssl_mode,
        status=ds.status,
        last_error=ds.last_error,
        is_active=ds.is_active,
        is_default=ds.is_default,
        table_count=tbl_count,
        column_count=col_count,
        tables=tables,
        last_synced_at=ds.last_synced_at,
        created_at=ds.created_at,
        updated_at=ds.updated_at,
    )


@router.post("/{source_id}/activate", response_model=ActiveDataSourceResponse)
def activate_data_source(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    """Switch active data source for the workspace to this connected database.

    Admin access only.
    """
    workspace = current_admin.workspace_name or "Default Workspace"
    ds = db.query(DataSource).filter(DataSource.id == source_id, DataSource.workspace_name == workspace).first()
    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found in your workspace",
        )

    # Deactivate others in workspace
    db.query(DataSource).filter(DataSource.workspace_name == workspace).update({"is_active": False})
    ds.is_active = True
    db.commit()
    db.refresh(ds)

    return build_active_response(workspace, ds)


@router.post("/activate-sandbox", response_model=ActiveDataSourceResponse)
def activate_sandbox(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    """Deactivate custom database and switch workspace back to the Demo Networking Sandbox.

    Admin access only.
    """
    workspace = current_admin.workspace_name or "Default Workspace"
    db.query(DataSource).filter(DataSource.workspace_name == workspace).update({"is_active": False})
    db.commit()

    return build_active_response(workspace, None)


@router.post("/{source_id}/sync", response_model=DataSourcePublic)
def sync_data_source_schema(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    """Re-introspect and synchronize schema tables and columns from the remote database.

    Admin access only.
    """
    workspace = current_admin.workspace_name or "Default Workspace"
    ds = db.query(DataSource).filter(DataSource.id == source_id, DataSource.workspace_name == workspace).first()
    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found in your workspace",
        )

    try:
        plain_pw = decrypt_secret(ds.encrypted_password)
        schema_catalog = introspect_database_schema(
            host=ds.host,
            port=ds.port,
            database_name=ds.database_name,
            username=ds.username,
            password=plain_pw,
            ssl_mode=ds.ssl_mode,
        )
        ds.schema_cache = schema_catalog
        ds.last_synced_at = datetime.now(timezone.utc)
        ds.status = "connected"
        ds.last_error = None
    except Exception as exc:
        ds.status = "error"
        ds.last_error = sanitize_db_error(exc)

    db.commit()
    db.refresh(ds)

    tables = ds.schema_cache.get("table_names", []) if ds.schema_cache else []
    col_count = ds.schema_cache.get("column_count", 0) if ds.schema_cache else 0
    tbl_count = ds.schema_cache.get("table_count", len(tables)) if ds.schema_cache else 0

    return DataSourcePublic(
        id=ds.id,
        workspace_name=ds.workspace_name,
        name=ds.name,
        db_type=ds.db_type,
        host=ds.host,
        port=ds.port,
        database_name=ds.database_name,
        username=ds.username,
        ssl_mode=ds.ssl_mode,
        status=ds.status,
        last_error=ds.last_error,
        is_active=ds.is_active,
        is_default=ds.is_default,
        table_count=tbl_count,
        column_count=col_count,
        tables=tables,
        last_synced_at=ds.last_synced_at,
        created_at=ds.created_at,
        updated_at=ds.updated_at,
    )


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_data_source(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    """Remove a connected data source from the workspace.

    Admin access only. Enforces tenant boundary.
    """
    workspace = current_admin.workspace_name or "Default Workspace"
    ds = db.query(DataSource).filter(DataSource.id == source_id, DataSource.workspace_name == workspace).first()
    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found in your workspace",
        )

    db.delete(ds)
    db.commit()
    return None
