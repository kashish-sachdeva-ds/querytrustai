from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class MetricItem(BaseModel):
    name: str
    value: int
    percentage: Optional[float] = None


class RecentEventItem(BaseModel):
    id: int
    device_id: int
    asset_tag: str
    event_type: str
    severity: str
    status: str
    opened_at: datetime


class DashboardSummaryResponse(BaseModel):
    total_devices: int
    active_devices: int
    expiring_warranties_30d: int
    open_service_events: int
    total_sites: int
    devices_by_type: List[MetricItem]
    devices_by_status: List[MetricItem]
    events_by_severity: List[MetricItem]
    recent_service_events: List[RecentEventItem]
    warranties_by_bucket: List[MetricItem] = []
    top_sites_by_expiring_warranties: List[MetricItem] = []
    reference_date: str = "2026-10-14"
