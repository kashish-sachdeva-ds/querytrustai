"""
Data Quality API schemas.
Defines request and response models for data quality profiling runs and findings.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


class DataQualityFindingItem(BaseModel):
    id: UUID
    run_id: UUID
    table_name: str
    column_name: Optional[str] = None
    rule_id: str
    rule_name: str
    severity: str  # critical, high, medium, low
    affected_rows: int
    total_rows: int
    affected_percentage: float
    example_identifiers: List[str] = Field(default_factory=list)
    suggested_action: str
    created_at: datetime

    class Config:
        from_attributes = True


class DataQualityRunSummary(BaseModel):
    id: UUID
    triggered_by: Optional[UUID] = None
    status: str
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    total_records_analyzed: int
    overall_health_score: float  # Percentage of clean records
    created_at: datetime
    completed_at: Optional[datetime] = None


class DataQualityRunResponse(BaseModel):
    summary: DataQualityRunSummary
    findings: List[DataQualityFindingItem]


class DataQualityFindingsResponse(BaseModel):
    total: int
    page: int
    limit: int
    findings: List[DataQualityFindingItem]
