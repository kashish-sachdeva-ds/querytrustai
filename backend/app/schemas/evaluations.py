"""
Evaluation API schemas.
Defines request and response models for evaluation benchmark runs.
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from app.schemas.common import StrictRequestModel
from datetime import datetime
from uuid import UUID


class CategoryMetric(BaseModel):
    total: int
    passed: int
    failed: int
    pass_rate: float


class CaseResult(BaseModel):
    case_id: str
    category: str
    question: str
    expected_behavior: str
    actual_behavior: str
    passed: bool
    failure_reason: Optional[str] = None
    interpreted_question: Optional[str] = None
    generated_sql: Optional[str] = None
    validation: Dict[str, Any] = Field(default_factory=dict)
    latency_ms: float


class FailureDetail(BaseModel):
    case_id: str
    category: str
    question: str
    expected_behavior: str
    actual_behavior: str
    failure_reason: str


class EvaluationRunResponse(BaseModel):
    evaluation_run_id: str
    benchmark_name: str
    benchmark_version: str
    dataset_version: str
    provider: str
    model: str
    mode: str
    is_demo_mode: bool
    prompt_version: str
    status: str
    total_cases: int
    passed_cases: int
    failed_cases: int
    overall_pass_rate: float
    safe_rejection_rate: float
    forbidden_execution_count: int
    clarification_accuracy: float
    multi_turn_correctness: float
    median_latency_ms: float
    p95_latency_ms: float
    category_metrics: Dict[str, CategoryMetric]
    case_results: List[CaseResult]
    failures_detail: List[FailureDetail]
    started_at: str
    completed_at: str


class EvaluationRunSummary(BaseModel):
    id: UUID
    benchmark_name: str
    benchmark_version: str
    provider: str
    mode: str
    status: str
    total_cases: int
    passed_cases: int
    failed_cases: int
    overall_pass_rate: float
    category_metrics: Dict[str, Any]
    started_at: datetime
    completed_at: Optional[datetime] = None


class EvaluationRunRequest(StrictRequestModel):
    mode: Literal["guarded", "baseline"] = Field(default="guarded", description="Pipeline mode: 'guarded' or 'baseline'")
