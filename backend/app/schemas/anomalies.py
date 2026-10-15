"""
Anomaly Detection API schemas.
Defines models for telemetry outlier detection, model metadata, and scan results.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


class ModelMetadataResponse(BaseModel):
    id: UUID
    model_name: str
    version: str
    algorithm: str
    feature_list: List[str]
    dataset_identifier: str
    contamination: float
    fit_time: datetime
    metrics: Dict[str, Any]
    is_active: bool
    status: str = "trained"


class TelemetryFeatureValues(BaseModel):
    cpu_percent: float
    memory_percent: float
    temperature_c: float
    packet_loss_percent: float
    latency_ms: float


class AnomalyItem(BaseModel):
    reading_id: int
    device_id: int
    asset_tag: str
    device_type: str
    vendor: str
    model: str
    site_name: str
    region: str
    recorded_at: datetime
    telemetry: TelemetryFeatureValues
    anomaly_score: float  # Normalized 0.0 to 1.0 (higher = more anomalous)
    is_outlier: bool
    known_injected_outlier: Optional[bool] = None
    rank: int


class AnomalyScanRequest(BaseModel):
    limit: int = Field(default=50, ge=1, le=500, description="Max number of top outliers to return")
    threshold: Optional[float] = Field(default=0.65, ge=0.0, le=1.0, description="Minimum anomaly score threshold")


class AnomalyScanResponse(BaseModel):
    model_version: str
    algorithm: str
    total_telemetry_scanned: int
    anomalies_detected: int
    disclaimer: str = "Statistical outlier score from unsupervised IsolationForest. Outlier scores are NOT failure probabilities."
    scan_time_ms: float
    top_anomalies: List[AnomalyItem]


class ModelTrainResponse(BaseModel):
    model_id: UUID
    version: str
    training_samples: int
    fit_duration_seconds: float
    metrics: Dict[str, Any]
    message: str
