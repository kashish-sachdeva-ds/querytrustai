from datetime import date, timedelta
import re
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Device, Site, ServiceEvent, User
from app.models.data_source import DataSource
from app.core.auth import get_current_user, is_demo_workspace
from app.core.cache import ttl_cache
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    MetricItem,
    RecentEventItem,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

REFERENCE_DATE = date(2026, 10, 14)


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    refresh: bool = Query(False, description="Bypass cache and force recalculation"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return live database-derived KPI metrics, distributions, and recent incidents.

    Requires authenticated user (any role: Viewer, Analyst, Admin).
    """
    cache_key = f"dashboard_summary:{current_user.workspace_name}"
    if not refresh:
        cached_val = ttl_cache.get(cache_key)
        if cached_val is not None:
            return cached_val

    # Enforce workspace data isolation: new company workspaces start empty until a database is connected or sample data is loaded
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
            return DashboardSummaryResponse(
                total_devices=0,
                total_sites=0,
                active_devices=0,
                expiring_warranties_30d=0,
                open_service_events=0,
                devices_by_type=[],
                devices_by_status=[],
                events_by_severity=[],
                recent_service_events=[],
                warranties_by_bucket=[],
                top_sites_by_expiring_warranties=[],
            )

    # 1. Total devices
    total_devices = db.query(func.count(Device.id)).scalar() or 0

    # 2. Active devices: lower(trim(status)) = 'active'
    active_devices = (
        db.query(func.count(Device.id))
        .filter(func.lower(func.trim(Device.status)) == "active")
        .scalar()
        or 0
    )

    # 3. Warranties expiring in next 30 days
    expiry_end = REFERENCE_DATE + timedelta(days=30)
    expiring_warranties_30d = (
        db.query(func.count(Device.id))
        .filter(
            Device.warranty_expiry >= REFERENCE_DATE,
            Device.warranty_expiry < expiry_end,
        )
        .scalar()
        or 0
    )

    # 4. Open service events (status not in resolved, closed, cancelled)
    open_service_events = (
        db.query(func.count(ServiceEvent.id))
        .filter(
            func.lower(func.trim(ServiceEvent.status)).notin_(
                ["resolved", "closed", "cancelled"]
            )
        )
        .scalar()
        or 0
    )

    # 5. Total sites
    total_sites = db.query(func.count(Site.id)).scalar() or 0

    # 6. Devices by type. The source dataset deliberately includes casing and
    # whitespace variants; the overview is an operational aggregate, so it
    # presents the approved category vocabulary while Data health retains the
    # finding that identifies the source-quality issue.
    type_rows = (
        db.query(func.lower(func.trim(Device.device_type)).label("dtype"), func.count(Device.id))
        .group_by("dtype")
        .order_by(func.count(Device.id).desc())
        .all()
    )
    approved_type_names = {
        "switch": "Switch",
        "router": "Router",
        "access point": "Access Point",
        "gateway": "Gateway",
        "firewall": "Firewall",
    }
    normalized_type_counts: dict[str, int] = {}
    for raw_type, count in type_rows:
        normalized_key = re.sub(r"\s+", " ", (raw_type or "").strip().lower())
        display_name = approved_type_names.get(normalized_key, normalized_key.title() or "Unknown")
        normalized_type_counts[display_name] = normalized_type_counts.get(display_name, 0) + count

    devices_by_type = [
        MetricItem(
            name=name,
            value=count,
            percentage=round((count / total_devices * 100), 1) if total_devices > 0 else 0,
        )
        for name, count in sorted(normalized_type_counts.items(), key=lambda item: item[1], reverse=True)
    ]

    # 7. Devices by status
    status_rows = (
        db.query(func.lower(func.trim(Device.status)).label("dstatus"), func.count(Device.id))
        .group_by("dstatus")
        .order_by(func.count(Device.id).desc())
        .all()
    )
    devices_by_status = [
        MetricItem(
            name=row[0].title(),
            value=row[1],
            percentage=round((row[1] / total_devices * 100), 1) if total_devices > 0 else 0,
        )
        for row in status_rows
    ]

    # 8. Service events by severity
    total_events = db.query(func.count(ServiceEvent.id)).scalar() or 0
    sev_rows = (
        db.query(ServiceEvent.severity, func.count(ServiceEvent.id))
        .group_by(ServiceEvent.severity)
        .order_by(func.count(ServiceEvent.id).desc())
        .all()
    )
    events_by_severity = [
        MetricItem(
            name=row[0].title(),
            value=row[1],
            percentage=round((row[1] / total_events * 100), 1) if total_events > 0 else 0,
        )
        for row in sev_rows
    ]

    # 9. Recent service events
    recent_events_raw = (
        db.query(ServiceEvent, Device.asset_tag)
        .join(Device, ServiceEvent.device_id == Device.id)
        .order_by(ServiceEvent.opened_at.desc())
        .limit(5)
        .all()
    )
    recent_service_events = [
        RecentEventItem(
            id=event.id,
            device_id=event.device_id,
            asset_tag=asset_tag,
            event_type=event.event_type,
            severity=event.severity,
            status=event.status,
            opened_at=event.opened_at,
        )
        for event, asset_tag in recent_events_raw
    ]

    # 10. Warranty expiry buckets
    d30 = REFERENCE_DATE + timedelta(days=30)
    d90 = REFERENCE_DATE + timedelta(days=90)
    d180 = REFERENCE_DATE + timedelta(days=180)

    count_expired = db.query(func.count(Device.id)).filter(Device.warranty_expiry < REFERENCE_DATE).scalar() or 0
    count_30d = expiring_warranties_30d
    count_90d = db.query(func.count(Device.id)).filter(Device.warranty_expiry >= d30, Device.warranty_expiry < d90).scalar() or 0
    count_180d = db.query(func.count(Device.id)).filter(Device.warranty_expiry >= d90, Device.warranty_expiry < d180).scalar() or 0
    count_beyond = db.query(func.count(Device.id)).filter(Device.warranty_expiry >= d180).scalar() or 0
    count_null = db.query(func.count(Device.id)).filter(Device.warranty_expiry.is_(None)).scalar() or 0

    warranties_by_bucket = [
        MetricItem(name="Already Expired", value=count_expired),
        MetricItem(name="0 - 30 Days", value=count_30d),
        MetricItem(name="31 - 90 Days", value=count_90d),
        MetricItem(name="91 - 180 Days", value=count_180d),
        MetricItem(name="> 180 Days", value=count_beyond),
        MetricItem(name="Missing Date", value=count_null),
    ]

    # 11. Top sites with upcoming warranty expirations (next 30d)
    top_sites_raw = (
        db.query(Site.site_name, func.count(Device.id).label("site_cnt"))
        .join(Device, Device.site_id == Site.id)
        .filter(Device.warranty_expiry >= REFERENCE_DATE, Device.warranty_expiry < expiry_end)
        .group_by(Site.site_name)
        .order_by(func.count(Device.id).desc())
        .limit(5)
        .all()
    )
    top_sites_by_expiring_warranties = [
        MetricItem(name=row[0], value=row[1])
        for row in top_sites_raw
    ]

    res = DashboardSummaryResponse(
        total_devices=total_devices,
        active_devices=active_devices,
        expiring_warranties_30d=expiring_warranties_30d,
        open_service_events=open_service_events,
        total_sites=total_sites,
        devices_by_type=devices_by_type,
        devices_by_status=devices_by_status,
        events_by_severity=events_by_severity,
        recent_service_events=recent_service_events,
        warranties_by_bucket=warranties_by_bucket,
        top_sites_by_expiring_warranties=top_sites_by_expiring_warranties,
        reference_date="2026-10-14",
    )
    ttl_cache.set(cache_key, res, ttl=60)
    return res
