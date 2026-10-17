import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc, asc

from app.database import get_db
from app.models.device import Device
from app.models.site import Site
from app.models.service_event import ServiceEvent
from app.models.user import User
from app.core.auth import get_current_user
from app.schemas.device import (
    DeviceCountsResponse,
    DeviceDetail,
    DeviceEventSummary,
    DeviceListResponse,
    DeviceSummary,
)

STATUS_CANONICAL_TO_DB = {
    "active": "active",
    "offline": "inactive",
    "inactive": "inactive",
    "retired": "decommissioned",
    "decommissioned": "decommissioned",
    "maintenance": "maintenance",
    "pending audit": "decommissioned_pending_audit",
    "pending_audit": "decommissioned_pending_audit",
    "decommissioned_pending_audit": "decommissioned_pending_audit",
    "staged": "staged",
}

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("", response_model=DeviceListResponse)
def list_devices(
    page: int = Query(1, ge=1, description="Page number, 1-indexed"),
    page_size: int = Query(20, ge=1, le=100, description="Page size (1-100)"),
    search: Optional[str] = Query(None, description="Search asset tag, model, serial, or vendor"),
    device_type: Optional[str] = Query(None, description="Filter by device type"),
    status: Optional[str] = Query(None, description="Filter by device status (case-insensitive canonical)"),
    site_id: Optional[int] = Query(None, description="Filter by site ID"),
    has_open_incidents: Optional[bool] = Query(None, description="Filter by devices with open service incidents"),
    needs_data_fix: Optional[bool] = Query(None, description="Filter devices needing data remediation (DQ-001..005)"),
    sort_by: str = Query("asset_tag", pattern="^(id|asset_tag|model|device_type|status|installed_at|warranty_expiry)$"),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a paginated, filterable, searchable list of networking devices.

    Available to all authenticated users (Viewer, Analyst, Admin).
    """
    query = (
        db.query(
            Device,
            Site.site_name,
            Site.site_code,
            Site.region,
        )
        .outerjoin(Site, Device.site_id == Site.id)
    )

    # 1. Search filter
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Device.asset_tag.ilike(search_pattern),
                Device.model.ilike(search_pattern),
                Device.serial_number.ilike(search_pattern),
                Device.vendor.ilike(search_pattern),
            )
        )

    # 2. Type filter
    if device_type:
        query = query.filter(func.lower(func.trim(Device.device_type)) == device_type.strip().lower())

    # 3. Status filter (case-insensitive with canonical mapping identical to Home)
    if status:
        norm_status = status.strip().lower()
        target_status = STATUS_CANONICAL_TO_DB.get(norm_status, norm_status)
        query = query.filter(func.lower(func.trim(Device.status)) == target_status)

    # 4. Site filter
    if site_id is not None:
        query = query.filter(Device.site_id == site_id)

    # 5. Open incidents filter (uses EXISTS / NOT EXISTS for correctness)
    if has_open_incidents is True:
        open_exists = (
            db.query(ServiceEvent.id)
            .filter(
                ServiceEvent.device_id == Device.id,
                func.lower(func.trim(ServiceEvent.status)).notin_(["resolved", "closed", "cancelled"]),
            )
            .exists()
        )
        query = query.filter(open_exists)
    elif has_open_incidents is False:
        open_exists = (
            db.query(ServiceEvent.id)
            .filter(
                ServiceEvent.device_id == Device.id,
                func.lower(func.trim(ServiceEvent.status)).notin_(["resolved", "closed", "cancelled"]),
            )
            .exists()
        )
        query = query.filter(~open_exists)

    # 6. Needs data fix filter — reuses exact DQ-001..DQ-005 rules from data_quality module
    if needs_data_fix is True:
        from app.core.data_quality import device_needs_data_fix_filter
        query = query.filter(device_needs_data_fix_filter())

    # Total count before pagination
    total = query.with_entities(func.count(Device.id)).scalar() or 0

    # Sorting
    sort_column = getattr(Device, sort_by, Device.asset_tag)
    order_clause = desc(sort_column) if sort_dir.lower() == "desc" else asc(sort_column)
    query = query.order_by(order_clause)

    # Pagination
    offset = (page - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()

    items = [
        DeviceSummary(
            id=dev.id,
            asset_tag=dev.asset_tag,
            device_type=dev.device_type,
            vendor=dev.vendor,
            model=dev.model,
            firmware_version=dev.firmware_version,
            site_id=dev.site_id,
            site_name=s_name,
            site_code=s_code,
            region=s_region,
            status=dev.status,
            installed_at=dev.installed_at,
            warranty_expiry=dev.warranty_expiry,
            serial_number=dev.serial_number,
        )
        for dev, s_name, s_code, s_region in rows
    ]

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return DeviceListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/counts", response_model=DeviceCountsResponse)
def get_device_counts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve quick filter counts across the device inventory.

    Reuses the exact canonical status mapping and data quality rules.
    Available to all authenticated roles (Viewer, Analyst, Admin).
    """
    from app.core.data_quality import device_needs_data_fix_filter

    total = db.query(func.count(Device.id)).scalar() or 0
    active = db.query(func.count(Device.id)).filter(func.lower(func.trim(Device.status)) == "active").scalar() or 0
    offline = db.query(func.count(Device.id)).filter(func.lower(func.trim(Device.status)) == "inactive").scalar() or 0
    maintenance = db.query(func.count(Device.id)).filter(func.lower(func.trim(Device.status)) == "maintenance").scalar() or 0
    retired = db.query(func.count(Device.id)).filter(func.lower(func.trim(Device.status)) == "decommissioned").scalar() or 0

    open_incidents = (
        db.query(func.count(Device.id))
        .filter(
            db.query(ServiceEvent.id)
            .filter(
                ServiceEvent.device_id == Device.id,
                func.lower(func.trim(ServiceEvent.status)).notin_(["resolved", "closed", "cancelled"]),
            )
            .exists()
        )
        .scalar()
        or 0
    )

    needs_data_fix = db.query(func.count(Device.id)).filter(device_needs_data_fix_filter()).scalar() or 0

    return DeviceCountsResponse(
        total=total,
        active=active,
        offline=offline,
        maintenance=maintenance,
        retired=retired,
        open_incidents=open_incidents,
        needs_data_fix=needs_data_fix,
    )


@router.get("/{device_id}", response_model=DeviceDetail)
def get_device_detail(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve detailed information for a single device, including recent service events."""
    row = (
        db.query(
            Device,
            Site.site_name,
            Site.site_code,
            Site.region,
        )
        .outerjoin(Site, Device.site_id == Site.id)
        .filter(Device.id == device_id)
        .first()
    )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with ID {device_id} not found",
        )

    dev, s_name, s_code, s_region = row

    # Recent service events
    events = (
        db.query(ServiceEvent)
        .filter(ServiceEvent.device_id == device_id)
        .order_by(ServiceEvent.opened_at.desc())
        .limit(10)
        .all()
    )

    return DeviceDetail(
        id=dev.id,
        asset_tag=dev.asset_tag,
        device_type=dev.device_type,
        vendor=dev.vendor,
        model=dev.model,
        firmware_version=dev.firmware_version,
        site_id=dev.site_id,
        site_name=s_name,
        site_code=s_code,
        region=s_region,
        status=dev.status,
        installed_at=dev.installed_at,
        warranty_expiry=dev.warranty_expiry,
        serial_number=dev.serial_number,
        recent_events=[
            DeviceEventSummary(
                id=ev.id,
                event_type=ev.event_type,
                severity=ev.severity,
                status=ev.status,
                opened_at=ev.opened_at,
                closed_at=ev.closed_at,
                description=ev.description,
            )
            for ev in events
        ],
    )
