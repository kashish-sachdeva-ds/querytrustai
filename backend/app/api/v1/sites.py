from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.site import Site
from app.models.device import Device
from app.models.user import User
from app.core.auth import get_current_user
from app.schemas.site import SiteListResponse, SiteSummary

router = APIRouter(prefix="/sites", tags=["Sites"])


@router.get("", response_model=SiteListResponse)
def list_sites(
    region: Optional[str] = Query(None, description="Filter by region (e.g. North, South, East, West)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve sites and their device counts. Authenticated."""
    query = (
        db.query(
            Site,
            func.count(Device.id).label("device_count"),
        )
        .outerjoin(Device, Device.site_id == Site.id)
    )

    if region:
        query = query.filter(func.lower(Site.region) == region.strip().lower())

    query = query.group_by(Site.id).order_by(Site.site_name.asc())
    rows = query.all()

    items = [
        SiteSummary(
            id=s.id,
            site_code=s.site_code,
            site_name=s.site_name,
            city=s.city,
            region=s.region,
            device_count=cnt,
        )
        for s, cnt in rows
    ]

    return SiteListResponse(
        items=items,
        total=len(items),
    )
