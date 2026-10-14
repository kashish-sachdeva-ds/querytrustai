from typing import Optional
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str = "0.1.0"
    environment: str
    llm_provider: str
    database: str
    details: Optional[dict] = None
