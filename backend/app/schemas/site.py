from typing import List, Optional
from pydantic import BaseModel


class SiteSummary(BaseModel):
    id: int
    site_code: str
    site_name: str
    city: str
    region: str
    device_count: Optional[int] = None

    class Config:
        from_attributes = True


class SiteListResponse(BaseModel):
    items: List[SiteSummary]
    total: int
