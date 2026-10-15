"""
Anomaly Detection API endpoints for QueryTrust AI.

Implements:
- GET /api/v1/anomalies/summary: Model version, algorithm, training metadata, and benchmark metrics
- POST /api/v1/anomalies/scan: Run unsupervised IsolationForest scan over telemetry readings
- POST /api/v1/anomalies/train: Fit or re-train IsolationForest on current telemetry dataset (Analyst, Admin)

INVARIANT: Anomaly score is strictly an unsupervised statistical outlier indicator,
NEVER described or exposed as a failure probability.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.core.auth import get_current_user
from app.core.anomaly_detector import anomaly_detector
from app.schemas.anomalies import (
    AnomalyScanRequest,
    AnomalyScanResponse,
    ModelMetadataResponse,
    ModelTrainResponse,
    AnomalyItem,
    TelemetryFeatureValues,
)

logger = logging.getLogger("querytrust.api.anomalies")
router = APIRouter(prefix="/anomalies", tags=["Anomalies"])


@router.get("/summary", response_model=ModelMetadataResponse)
def get_anomaly_model_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves active ML model version, algorithm, feature vector, and synthetic evaluation metrics."""
    # Ensure model exists
    if not anomaly_detector.is_model_trained():
        logger.info("Model artifact missing. Auto-training baseline model...")
        anomaly_detector.train_model(db)

    meta = anomaly_detector.get_metadata(db)
    if not meta:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve anomaly model metadata.",
        )

    return ModelMetadataResponse(
        id=meta["id"],
        model_name=meta["model_name"],
        version=meta["version"],
        algorithm=meta["algorithm"],
        feature_list=meta["feature_list"],
        dataset_identifier=meta["dataset_identifier"],
        contamination=meta["contamination"],
        fit_time=meta["fit_time"],
        metrics=meta["metrics"],
        is_active=meta["is_active"],
        status=meta.get("status", "active"),
    )


@router.post("/scan", response_model=AnomalyScanResponse)
def run_telemetry_anomaly_scan(
    payload: AnomalyScanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Executes an unsupervised IsolationForest anomaly detection scan across telemetry readings.

    Returns the top-ranked statistical outliers sorted by anomaly score.
    """
    try:
        scan_results = anomaly_detector.scan_telemetry(
            db=db,
            limit=payload.limit,
            threshold=payload.threshold or 0.65,
        )

        top_items = [
            AnomalyItem(
                reading_id=item["reading_id"],
                device_id=item["device_id"],
                asset_tag=item["asset_tag"],
                device_type=item["device_type"],
                vendor=item["vendor"],
                model=item["model"],
                site_name=item["site_name"],
                region=item["region"],
                recorded_at=item["recorded_at"],
                telemetry=TelemetryFeatureValues(**item["telemetry"]),
                anomaly_score=item["anomaly_score"],
                is_outlier=item["is_outlier"],
                known_injected_outlier=item.get("known_injected_outlier"),
                rank=item.get("rank", idx + 1),
            )
            for idx, item in enumerate(scan_results["top_anomalies"])
        ]

        return AnomalyScanResponse(
            model_version=scan_results["model_version"],
            algorithm=scan_results["algorithm"],
            total_telemetry_scanned=scan_results["total_telemetry_scanned"],
            anomalies_detected=scan_results["anomalies_detected"],
            scan_time_ms=scan_results["scan_time_ms"],
            top_anomalies=top_items,
        )
    except Exception as e:
        logger.error(f"Error executing telemetry anomaly scan: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Telemetry anomaly scan failed: {str(e)}",
        )


@router.post("/train", response_model=ModelTrainResponse)
def train_anomaly_model(
    contamination: float = Query(0.015, ge=0.001, le=0.1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trains or re-fits the scikit-learn IsolationForest model on database telemetry.

    Restricted to Analyst and Admin roles.
    """
    if current_user.role not in ["analyst", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Analyst and Admin users are authorized to train ML models.",
        )

    try:
        result = anomaly_detector.train_model(db=db, contamination=contamination)
        meta = anomaly_detector.get_metadata(db)

        return ModelTrainResponse(
            model_id=meta["id"] if meta else None,
            version=result["model_version"],
            training_samples=result["training_samples"],
            fit_duration_seconds=result["fit_duration_seconds"],
            metrics=result["metrics"],
            message=f"IsolationForest model v{result['model_version']} successfully fitted on {result['training_samples']} telemetry observations.",
        )
    except Exception as e:
        logger.error(f"Error training IsolationForest model: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model training failed: {str(e)}",
        )
