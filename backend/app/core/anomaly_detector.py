"""
Telemetry Anomaly Detection Engine for QueryTrust AI.

Implements Section 13 of PROJECT_SPEC.md:
- Fits and serves scikit-learn IsolationForest on multi-metric device telemetry:
  [cpu_percent, memory_percent, temperature_c, packet_loss_percent, latency_ms]
- Standardizes feature vector with StandardScaler and persists artifact with joblib.
- Evaluates offline detection metrics against synthetic known_injected_outlier labels.
- Persists model version metadata in ml_model_versions table.
- Strict Invariant: Anomaly score is an unsupervised statistical outlier indicator,
  NEVER described as a failure probability.
"""

import os
import uuid
import time
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.telemetry import TelemetryReading
from app.models.device import Device
from app.models.site import Site
from app.models.ml_model import MLModelVersion

logger = logging.getLogger("querytrust.ml")

ARTIFACT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml_artifacts")
MODEL_FILENAME = "telemetry_isolation_forest_v1.joblib"
MODEL_PATH = os.path.join(ARTIFACT_DIR, MODEL_FILENAME)

FEATURE_COLUMNS = [
    "cpu_percent",
    "memory_percent",
    "temperature_c",
    "packet_loss_percent",
    "latency_ms",
]

DEFAULT_CONTAMINATION = 0.015  # ~1.5% expected outlier rate
MODEL_VERSION = "1.0.0"
MODEL_NAME = "telemetry_isolation_forest"


class TelemetryAnomalyDetector:
    """Manages training, artifact persistence, evaluation, and inference for telemetry anomaly detection."""

    def __init__(self, model_path: str = MODEL_PATH):
        self.model_path = model_path
        self.scaler: Optional[StandardScaler] = None
        self.model: Optional[IsolationForest] = None
        self._ensure_artifact_dir()

    def _ensure_artifact_dir(self):
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)

    def is_model_trained(self) -> bool:
        """Checks if the serialized model artifact exists on disk."""
        return os.path.exists(self.model_path)

    def train_model(
        self,
        db: Session,
        contamination: float = DEFAULT_CONTAMINATION,
        random_state: int = 42,
    ) -> Dict[str, Any]:
        """Fetches telemetry observations, fits StandardScaler and IsolationForest,

        evaluates synthetic benchmark metrics, and persists the pipeline and metadata.
        """
        logger.info(f"Training {MODEL_NAME} v{MODEL_VERSION}...")
        start_time = time.perf_counter()

        # Fetch telemetry dataset from database
        readings = (
            db.query(
                TelemetryReading.id,
                TelemetryReading.cpu_percent,
                TelemetryReading.memory_percent,
                TelemetryReading.temperature_c,
                TelemetryReading.packet_loss_percent,
                TelemetryReading.latency_ms,
                TelemetryReading.known_injected_outlier,
            )
            .all()
        )

        if not readings:
            raise ValueError("No telemetry readings available in the database for model training.")

        data = [
            {
                "id": r.id,
                "cpu_percent": r.cpu_percent,
                "memory_percent": r.memory_percent,
                "temperature_c": r.temperature_c,
                "packet_loss_percent": r.packet_loss_percent,
                "latency_ms": r.latency_ms,
                "known_injected_outlier": r.known_injected_outlier,
            }
            for r in readings
        ]
        df = pd.DataFrame(data)

        X = df[FEATURE_COLUMNS].values
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        iso_forest = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=random_state,
            n_jobs=-1,
        )
        iso_forest.fit(X_scaled)

        # Evaluate against known synthetic outlier labels for benchmark reporting
        preds = iso_forest.predict(X_scaled)  # -1 = outlier, 1 = inlier
        predicted_outliers = preds == -1
        actual_outliers = df["known_injected_outlier"].values

        true_positives = int(np.sum(predicted_outliers & actual_outliers))
        false_positives = int(np.sum(predicted_outliers & ~actual_outliers))
        false_negatives = int(np.sum(~predicted_outliers & actual_outliers))
        true_negatives = int(np.sum(~predicted_outliers & ~actual_outliers))

        precision = round(true_positives / max(true_positives + false_positives, 1), 4)
        recall = round(true_positives / max(true_positives + false_negatives, 1), 4)
        f1 = round(2 * (precision * recall) / max(precision + recall, 1e-6), 4)

        duration = round(time.perf_counter() - start_time, 3)

        metrics = {
            "training_samples": len(df),
            "detected_outliers_count": int(np.sum(predicted_outliers)),
            "known_injected_outliers_count": int(np.sum(actual_outliers)),
            "synthetic_benchmark_metrics": {
                "precision": precision,
                "recall": recall,
                "f1_score": f1,
                "true_positives": true_positives,
                "false_positives": false_positives,
                "false_negatives": false_negatives,
            },
            "disclaimer": "Metrics evaluated on synthetic educational dataset with injected telemetry spikes. Not indicative of real-world device failure rates.",
        }

        # Save artifact package
        artifact_package = {
            "model": iso_forest,
            "scaler": scaler,
            "features": FEATURE_COLUMNS,
            "contamination": contamination,
            "random_state": random_state,
            "version": MODEL_VERSION,
            "fit_time": datetime.now(timezone.utc).isoformat(),
            "metrics": metrics,
        }
        joblib.dump(artifact_package, self.model_path)

        self.model = iso_forest
        self.scaler = scaler

        # Record version in database
        db_version = (
            db.query(MLModelVersion)
            .filter(MLModelVersion.model_name == MODEL_NAME, MLModelVersion.version == MODEL_VERSION)
            .first()
        )
        if not db_version:
            db_version = MLModelVersion(
                id=uuid.uuid4(),
                model_name=MODEL_NAME,
                version=MODEL_VERSION,
                algorithm="IsolationForest",
                feature_list=FEATURE_COLUMNS,
                dataset_identifier=f"synthetic_telemetry_{len(df)}_rows",
                metrics=metrics,
                model_artifact_path=self.model_path,
                fit_time=datetime.now(timezone.utc),
                is_active=True,
            )
            db.add(db_version)
        else:
            db_version.metrics = metrics
            db_version.fit_time = datetime.now(timezone.utc)
            db_version.is_active = True

        db.commit()
        logger.info(f"Model trained and saved to {self.model_path} in {duration}s.")

        return {
            "model_version": MODEL_VERSION,
            "training_samples": len(df),
            "fit_duration_seconds": duration,
            "metrics": metrics,
        }

    def _load_model(self):
        """Loads serialized model and scaler from artifact path."""
        if self.model is not None and self.scaler is not None:
            return

        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"Model artifact not found at {self.model_path}. Train the model before running inference."
            )

        pkg = joblib.load(self.model_path)
        self.model = pkg["model"]
        self.scaler = pkg["scaler"]

    def scan_telemetry(
        self,
        db: Session,
        limit: int = 50,
        threshold: float = 0.65,
    ) -> Dict[str, Any]:
        """Performs statistical anomaly scanning over telemetry readings in the database.

        Returns top ranked outliers sorted by anomaly score.
        """
        start_time = time.perf_counter()

        # Auto-train if artifact missing
        if not self.is_model_trained():
            logger.info("Model artifact not found. Auto-fitting on initial startup...")
            self.train_model(db)

        self._load_model()

        # Query all readings with joined Device and Site data
        readings = (
            db.query(
                TelemetryReading,
                Device.asset_tag,
                Device.device_type,
                Device.vendor,
                Device.model,
                Site.site_name,
                Site.region,
            )
            .join(Device, TelemetryReading.device_id == Device.id)
            .join(Site, Device.site_id == Site.id)
            .all()
        )

        if not readings:
            return {
                "model_version": MODEL_VERSION,
                "algorithm": "IsolationForest",
                "total_telemetry_scanned": 0,
                "anomalies_detected": 0,
                "scan_time_ms": 0.0,
                "top_anomalies": [],
            }

        # Build feature matrix
        feat_matrix = np.array(
            [
                [
                    r[0].cpu_percent,
                    r[0].memory_percent,
                    r[0].temperature_c,
                    r[0].packet_loss_percent,
                    r[0].latency_ms,
                ]
                for r in readings
            ]
        )

        X_scaled = self.scaler.transform(feat_matrix)

        # Decision function: lower values mean more anomalous
        scores_raw = self.model.decision_function(X_scaled)
        preds = self.model.predict(X_scaled)  # -1 = outlier

        # Normalize score to 0.0 - 1.0 range where 1.0 is the most anomalous outlier
        # score = 0.5 - 0.5 * raw_score
        norm_scores = np.clip(0.5 - (scores_raw * 2.5), 0.0, 1.0)

        results = []
        for i, row in enumerate(readings):
            t_reading, asset_tag, dtype, vendor, model, site_name, region = row
            score = float(round(norm_scores[i], 4))
            is_outlier = bool(preds[i] == -1 or score >= threshold)

            if is_outlier:
                # A human-friendly severity tie-breaker. This is deliberately a
                # count of readings outside documented review thresholds, not a
                # prediction about device health or failure.
                problem_signal_count = sum(
                    (
                        t_reading.cpu_percent > 85,
                        t_reading.memory_percent > 85,
                        t_reading.temperature_c > 75,
                        t_reading.packet_loss_percent > 5,
                        t_reading.latency_ms > 100,
                    )
                )
                results.append(
                    {
                        "reading_id": t_reading.id,
                        "device_id": t_reading.device_id,
                        "asset_tag": asset_tag,
                        "device_type": dtype.strip() if dtype else "Unknown",
                        "vendor": vendor,
                        "model": model,
                        "site_name": site_name,
                        "region": region,
                        "recorded_at": t_reading.recorded_at,
                        "telemetry": {
                            "cpu_percent": t_reading.cpu_percent,
                            "memory_percent": t_reading.memory_percent,
                            "temperature_c": t_reading.temperature_c,
                            "packet_loss_percent": t_reading.packet_loss_percent,
                            "latency_ms": t_reading.latency_ms,
                        },
                        "anomaly_score": score,
                        "problem_signal_count": problem_signal_count,
                        "is_outlier": is_outlier,
                        "known_injected_outlier": t_reading.known_injected_outlier,
                    }
                )

        # Preserve the statistical rank, then prefer readings with more
        # independently concerning signals when rounded scores are tied.
        results.sort(
            key=lambda x: (x["anomaly_score"], x["problem_signal_count"]),
            reverse=True,
        )

        # Add ranks
        for rank_idx, item in enumerate(results[:limit], start=1):
            item["rank"] = rank_idx

        scan_duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "model_version": MODEL_VERSION,
            "algorithm": "IsolationForest",
            "total_telemetry_scanned": len(readings),
            "anomalies_detected": len(results),
            "scan_time_ms": scan_duration_ms,
            "top_anomalies": results[:limit],
        }

    def get_metadata(self, db: Session) -> Optional[Dict[str, Any]]:
        """Returns active model metadata from database or serialized artifact."""
        db_model = (
            db.query(MLModelVersion)
            .filter(MLModelVersion.model_name == MODEL_NAME, MLModelVersion.is_active == True)
            .order_by(desc(MLModelVersion.fit_time))
            .first()
        )

        if db_model:
            return {
                "id": db_model.id,
                "model_name": db_model.model_name,
                "version": db_model.version,
                "algorithm": db_model.algorithm,
                "feature_list": db_model.feature_list,
                "dataset_identifier": db_model.dataset_identifier,
                "contamination": DEFAULT_CONTAMINATION,
                "fit_time": db_model.fit_time,
                "metrics": db_model.metrics or {},
                "is_active": db_model.is_active,
                "status": "active",
            }

        # Fallback to loading artifact if available
        if self.is_model_trained():
            pkg = joblib.load(self.model_path)
            return {
                "id": uuid.uuid4(),
                "model_name": MODEL_NAME,
                "version": pkg.get("version", MODEL_VERSION),
                "algorithm": "IsolationForest",
                "feature_list": pkg.get("features", FEATURE_COLUMNS),
                "dataset_identifier": "synthetic_telemetry_25k",
                "contamination": pkg.get("contamination", DEFAULT_CONTAMINATION),
                "fit_time": datetime.fromisoformat(pkg["fit_time"]) if "fit_time" in pkg else datetime.now(timezone.utc),
                "metrics": pkg.get("metrics", {}),
                "is_active": True,
                "status": "ready",
            }

        return None


# Global singleton instance
anomaly_detector = TelemetryAnomalyDetector()
