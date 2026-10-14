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
    DeviceDetail,
    DeviceEventSummary,
    DeviceListResponse,
    DeviceSummary,
)

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("", response_model=DeviceListResponse)
def list_devices(
    page: int = Query(1, ge=1, description="Page number, 1-indexed"),
    page_size: int = Query(20, ge=1, le=100, description="Page size (1-100)"),
    search: Optional[str] = Query(None, description="Search asset tag, model, serial, or vendor"),
    device_type: Optional[str] = Query(None, description="Filter by device type"),
    status: Optional[str] = Query(None, description="Filter by device status"),
    site_id: Optional[int] = Query(None, description="Filter by site ID"),
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

    # 3. Status filter
    if status:
        query = query.filter(func.lower(func.trim(Device.status)) == status.strip().lower())

    # 4. Site filter
    if site_id is not None:
        query = query.filter(Device.site_id == site_id)

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
