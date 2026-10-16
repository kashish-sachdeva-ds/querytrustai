import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, StrictBool, field_validator
from app.schemas.common import StrictRequestModel


class PreviewRequest(StrictRequestModel):
    question: str = Field(..., min_length=2, max_length=1000, description="Natural language question to translate to SQL")
    session_id: Optional[uuid.UUID] = Field(None, description="Optional chat session UUID to preserve conversation history")

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        if not value:
            raise ValueError("Question must not be blank")
        return value


class ValidationDetail(BaseModel):
    passed: bool
    checks: List[str] = Field(default_factory=list)
    violations: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    tables_referenced: List[str] = Field(default_factory=list)


class PreviewResponse(BaseModel):
    query_run_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    status: str  # previewed, blocked, clarification_needed, unsupported
    intent_status: str  # ready, clarification_needed, unsupported
    interpreted_question: str
    clarification_question: Optional[str] = None
    sql_preview: Optional[str] = None
    validation: ValidationDetail
    assumptions: List[str] = Field(default_factory=list)
    business_terms_used: List[str] = Field(default_factory=list)
    can_execute: bool = False
    provider: str
    model: str
    is_demo_mode: bool = True
    created_at: datetime


class ExecuteRequest(StrictRequestModel):
    query_run_id: uuid.UUID = Field(..., description="Server-stored opaque preview ID. Arbitrary SQL text is not accepted.")


class ChartRecommendation(BaseModel):
    chart_type: str = Field(..., description="'bar', 'pie', 'line', 'table', or 'metric'")
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None
    title: str = ""


class ExecuteResponse(BaseModel):
    query_run_id: uuid.UUID
    status: str  # executed, failed, blocked
    row_count: int
    columns: List[str]
    rows: List[Dict[str, Any]]
    truncated: bool = False
    execution_duration_ms: float
    executed_at: datetime
    chart_recommendation: ChartRecommendation
    result_summary: str


class FeedbackRequest(StrictRequestModel):
    query_run_id: uuid.UUID
    is_helpful: StrictBool
    explanation: Optional[str] = Field(None, max_length=1000)


class FeedbackResponse(BaseModel):
    id: uuid.UUID
    query_run_id: uuid.UUID
    is_helpful: bool
    explanation: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class QueryHistoryItem(BaseModel):
    id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    user_id: uuid.UUID
    question: str
    interpreted_question: Optional[str] = None
    generated_sql: str
    status: str
    row_count: Optional[int] = None
    execution_duration_ms: Optional[float] = None
    error_category: Optional[str] = None
    created_at: datetime
    executed_at: Optional[datetime] = None
    is_helpful: Optional[bool] = None
    feedback_explanation: Optional[str] = None

    class Config:
        from_attributes = True


class QueryHistoryResponse(BaseModel):
    items: List[QueryHistoryItem]
    total: int
    page: int
    page_size: int
    total_pages: int
