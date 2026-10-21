import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.webhook import WebhookConfig
from app.core.auth import get_current_user, require_role
from app.schemas.webhook import (
    WebhookConfigCreate,
    WebhookConfigUpdate,
    WebhookConfigPublic,
    WebhookTestRequest,
    WebhookTestResponse,
)
from app.services.webhook_dispatcher import (
    validate_webhook_url,
    dispatch_webhook,
)

logger = logging.getLogger("querytrust.api.webhooks")
router = APIRouter(prefix="/webhooks", tags=["Alert Webhooks"])


@router.get("", response_model=Optional[WebhookConfigPublic])
def get_workspace_webhook(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve the active alert webhook configuration for the caller's company workspace."""
    workspace = current_user.workspace_name or "Default Workspace"
    config = (
        db.query(WebhookConfig)
        .filter(WebhookConfig.workspace_name == workspace)
        .first()
    )
    if not config:
        return None

    return WebhookConfigPublic(
        id=config.id,
        workspace_name=config.workspace_name,
        name=config.name,
        url=config.url,
        platform=config.platform,
        has_secret_token=bool(config.secret_token),
        is_active=config.is_active,
        notify_on_anomaly=config.notify_on_anomaly,
        notify_on_data_quality=config.notify_on_data_quality,
        last_dispatched_at=config.last_dispatched_at,
        last_status_code=config.last_status_code,
        last_error=config.last_error,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.post("", response_model=WebhookConfigPublic, status_code=status.HTTP_201_CREATED)
def configure_workspace_webhook(
    payload: WebhookConfigCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Create or update alert webhook configuration for the workspace (Administrator only)."""
    workspace = current_user.workspace_name or "Default Workspace"

    try:
        validate_webhook_url(payload.url)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    config = (
        db.query(WebhookConfig)
        .filter(WebhookConfig.workspace_name == workspace)
        .first()
    )
    if not config:
        config = WebhookConfig(
            workspace_name=workspace,
            name=payload.name,
            url=payload.url,
            platform=payload.platform,
            secret_token=payload.secret_token,
            is_active=payload.is_active,
            notify_on_anomaly=payload.notify_on_anomaly,
            notify_on_data_quality=payload.notify_on_data_quality,
        )
        db.add(config)
    else:
        config.name = payload.name
        config.url = payload.url
        config.platform = payload.platform
        if payload.secret_token is not None:
            config.secret_token = payload.secret_token
        config.is_active = payload.is_active
        config.notify_on_anomaly = payload.notify_on_anomaly
        config.notify_on_data_quality = payload.notify_on_data_quality
        config.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(config)

    return WebhookConfigPublic(
        id=config.id,
        workspace_name=config.workspace_name,
        name=config.name,
        url=config.url,
        platform=config.platform,
        has_secret_token=bool(config.secret_token),
        is_active=config.is_active,
        notify_on_anomaly=config.notify_on_anomaly,
        notify_on_data_quality=config.notify_on_data_quality,
        last_dispatched_at=config.last_dispatched_at,
        last_status_code=config.last_status_code,
        last_error=config.last_error,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.post("/test", response_model=WebhookTestResponse)
async def test_webhook_dispatch(
    payload: WebhookTestRequest,
    current_user: User = Depends(require_role(["admin", "analyst"])),
    db: Session = Depends(get_db),
):
    """Dispatch an immediate test notification to verify external webhook connectivity."""
    workspace = current_user.workspace_name or "Default Workspace"
    target_url = payload.url
    target_platform = payload.platform or "discord"
    secret_token = None

    if not target_url:
        config = (
            db.query(WebhookConfig)
            .filter(WebhookConfig.workspace_name == workspace)
            .first()
        )
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No webhook configured for this workspace. Provide a destination URL in the request.",
            )
        target_url = config.url
        target_platform = config.platform
        secret_token = config.secret_token

    try:
        validate_webhook_url(target_url)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    fields = [
        {"name": "Triggered By", "value": current_user.display_name},
        {"name": "Workspace", "value": workspace},
        {"name": "Channel Platform", "value": target_platform.capitalize()},
        {"name": "Verification Status", "value": "Operational ✅"},
    ]

    success, status_code, latency_ms, msg = await dispatch_webhook(
        url=target_url,
        platform=target_platform,
        alert_type="test_notification",
        title="QueryTrust AI Alert Dispatcher Verified",
        description="Your automated alert pipeline is successfully connected and receiving live notifications.",
        fields=fields,
        severity="info",
        secret_token=secret_token,
    )

    # Record dispatch telemetry on saved config if present
    config = (
        db.query(WebhookConfig)
        .filter(WebhookConfig.workspace_name == workspace)
        .first()
    )
    if config:
        config.last_dispatched_at = datetime.now(timezone.utc)
        config.last_status_code = str(status_code) if status_code else "ERROR"
        config.last_error = None if success else msg
        db.commit()

    return WebhookTestResponse(
        success=success,
        status_code=status_code,
        latency_ms=latency_ms,
        message=msg,
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace_webhook(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Delete the alert webhook configuration for the workspace (Administrator only)."""
    workspace = current_user.workspace_name or "Default Workspace"
    config = (
        db.query(WebhookConfig)
        .filter(WebhookConfig.workspace_name == workspace)
        .first()
    )
    if config:
        db.delete(config)
        db.commit()
