from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel


class DeviceSummary(BaseModel):
    id: int
    asset_tag: str
    device_type: str
    vendor: str
    model: str
    firmware_version: str
    site_id: int
    site_name: Optional[str] = None
    site_code: Optional[str] = None
    region: Optional[str] = None
    status: str
    installed_at: date
    warranty_expiry: Optional[date] = None
    serial_number: Optional[str] = None

    class Config:
        from_attributes = True


class DeviceEventSummary(BaseModel):
    id: int
    event_type: str
    severity: str
    status: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class DeviceDetail(DeviceSummary):
    recent_events: List[DeviceEventSummary] = []


class DeviceListResponse(BaseModel):
    items: List[DeviceSummary]
    total: int
    page: int
    page_size: int
    total_pages: int
