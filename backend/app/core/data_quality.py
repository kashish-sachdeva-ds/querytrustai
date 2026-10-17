"""
Data Quality Profiler Engine for QueryTrust AI.

Implements Section 12 of PROJECT_SPEC.md:
- Rule 1 (DQ-001): Missing critical values (warranty_expiry, serial_number, firmware_version)
- Rule 2 (DQ-002): Invalid date sequence (warranty_expiry < installed_at)
- Rule 3 (DQ-003): Duplicate serial numbers
- Rule 4 (DQ-004): Inconsistent device category formatting (casing/whitespace or unapproved types)
- Rule 5 (DQ-005): Unexpected device status values outside approved vocabulary
- Rule 6 (DQ-006): Telemetry metric range violations (CPU, memory, packet loss, latency)

INVARIANT: This subsystem is strictly read-only diagnostics. It never mutates or deletes database rows.
"""

import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text, func

from app.models.data_quality import DataQualityRun, DataQualityFinding
from app.models.device import Device
from app.models.telemetry import TelemetryReading

logger = logging.getLogger("querytrust.data_quality")

APPROVED_DEVICE_TYPES = {"Switch", "Router", "Firewall", "Access Point", "Gateway"}
APPROVED_STATUSES = {"active", "inactive", "maintenance", "decommissioned"}


def device_needs_data_fix_filter():
    """Returns a SQLAlchemy OR filter matching devices flagged by DQ-001..DQ-005.

    The same rules used by the DataQualityProfiler:
      DQ-001a: warranty_expiry IS NULL
      DQ-001b: serial_number IS NULL or blank
      DQ-002:  warranty_expiry < installed_at (both non-null)
      DQ-003:  duplicate serial numbers (uses EXISTS subquery)
      DQ-004:  device_type not in APPROVED_DEVICE_TYPES (exact TitleCase match)
      DQ-005:  status (normalized lower) not in APPROVED_STATUSES

    NOTE: DQ-001a/DQ-001b are display-only split IDs in the UI; both map to rule DQ-001.
    DQ-006 (telemetry range) is excluded because it applies to telemetry_readings, not devices.

    Returns:
        A SQLAlchemy BinaryExpression suitable for query.filter().
    """
    from sqlalchemy import or_, and_, exists, select, func as sa_func
    from app.models.device import Device as DevModel

    # DQ-003: Duplicate serial via subquery with GROUP BY ... HAVING COUNT > 1
    # This evaluates as an efficient hash semi-join in PostgreSQL instead of a quadratic correlated loop
    dup_sn_subquery = (
        select(sa_func.lower(sa_func.trim(DevModel.serial_number)))
        .where(
            DevModel.serial_number.is_not(None),
            sa_func.trim(DevModel.serial_number) != "",
        )
        .group_by(sa_func.lower(sa_func.trim(DevModel.serial_number)))
        .having(sa_func.count(DevModel.id) > 1)
    )

    return or_(
        # DQ-001a: Missing warranty
        DevModel.warranty_expiry.is_(None),
        # DQ-001b: Missing serial
        DevModel.serial_number.is_(None),
        sa_func.trim(DevModel.serial_number) == "",
        # DQ-002: Inverted dates
        and_(
            DevModel.warranty_expiry.is_not(None),
            DevModel.installed_at.is_not(None),
            DevModel.warranty_expiry < DevModel.installed_at,
        ),
        # DQ-003: Duplicate serials
        and_(
            DevModel.serial_number.is_not(None),
            sa_func.trim(DevModel.serial_number) != "",
            sa_func.lower(sa_func.trim(DevModel.serial_number)).in_(dup_sn_subquery),
        ),
        # DQ-004: Non-approved device type
        DevModel.device_type.notin_(list(APPROVED_DEVICE_TYPES)),
        # DQ-005: Non-approved status
        sa_func.lower(sa_func.trim(DevModel.status)).notin_(list(APPROVED_STATUSES)),
    )


class DataQualityProfiler:
    """Orchestrates deterministic diagnostic profiling runs across inventory and telemetry tables."""

    def __init__(self, db: Session):
        self.db = db

    def run_all_checks(self, triggered_by_user_id: Optional[uuid.UUID] = None) -> DataQualityRun:
        """Executes full diagnostic profile against live database and persists run findings."""
        logger.info("Starting data quality profiling run...")
        start_time = datetime.now(timezone.utc)

        # Create run record
        run = DataQualityRun(
            id=uuid.uuid4(),
            triggered_by=triggered_by_user_id,
            status="running",
            total_findings=0,
            created_at=start_time,
        )
        self.db.add(run)
        self.db.commit()

        findings: List[DataQualityFinding] = []

        try:
            # 1. Missing Values in Devices (warranty_expiry, serial_number, firmware_version)
            findings.extend(self._check_missing_device_fields(run.id))

            # 2. Invalid Date Sequence (warranty_expiry < installed_at)
            findings.extend(self._check_invalid_date_relationships(run.id))

            # 3. Duplicate Serial Numbers
            findings.extend(self._check_duplicate_serials(run.id))

            # 4. Inconsistent Device Category Formatting
            findings.extend(self._check_category_inconsistencies(run.id))

            # 5. Unexpected Device Status Values
            findings.extend(self._check_unexpected_status_values(run.id))

            # 6. Telemetry Range Violations
            findings.extend(self._check_telemetry_range_violations(run.id))

            # Persist findings
            self.db.add_all(findings)

            # Calculate summary stats
            total_findings_count = len(findings)
            critical_count = sum(1 for f in findings if f.severity == "critical")
            high_count = sum(1 for f in findings if f.severity == "high")
            medium_count = sum(1 for f in findings if f.severity == "medium")
            low_count = sum(1 for f in findings if f.severity == "low")

            total_devices = self.db.query(func.count(Device.id)).scalar() or 0
            total_telemetry = self.db.query(func.count(TelemetryReading.id)).scalar() or 0
            total_records = total_devices + total_telemetry

            # Overall health calculation: weighted defect deductions
            total_defects = sum(f.affected_rows for f in findings)
            health_score = max(0.0, min(100.0, round((1.0 - (total_defects / max(total_records, 1))) * 100, 2)))

            summary_json = {
                "critical_count": critical_count,
                "high_count": high_count,
                "medium_count": medium_count,
                "low_count": low_count,
                "total_records_analyzed": total_records,
                "total_defective_records": total_defects,
                "overall_health_score": health_score,
                "rules_evaluated": 6,
            }

            run.status = "completed"
            run.total_findings = total_findings_count
            run.summary_json = summary_json
            run.completed_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(run)

            logger.info(f"Data quality profiling run {run.id} finished with {total_findings_count} findings.")
            return run

        except Exception as e:
            logger.error(f"Error during data quality profiling: {e}", exc_info=True)
            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc)
            self.db.commit()
            raise

    def _check_missing_device_fields(self, run_id: uuid.UUID) -> List[DataQualityFinding]:
        """Rule 1 (DQ-001): Identifies missing/null values in key device attributes."""
        findings = []
        total_devices = self.db.query(func.count(Device.id)).scalar() or 1

        # Check warranty_expiry
        null_warranty_q = self.db.query(Device.asset_tag).filter(Device.warranty_expiry.is_(None))
        affected_count = null_warranty_q.count()
        if affected_count > 0:
            examples = [r[0] for r in null_warranty_q.limit(5).all()]
            findings.append(
                DataQualityFinding(
                    id=uuid.uuid4(),
                    run_id=run_id,
                    table_name="devices",
                    column_name="warranty_expiry",
                    rule_name="DQ-001: Missing Warranty Expiration",
                    severity="high",
                    affected_rows=affected_count,
                    affected_percentage=round((affected_count / total_devices) * 100, 2),
                    example_identifiers=examples,
                    suggested_action="Reconcile hardware maintenance contract with procurement records and update warranty expiration date.",
                )
            )

        # Check serial_number
        null_serial_q = self.db.query(Device.asset_tag).filter(
            (Device.serial_number.is_(None)) | (func.trim(Device.serial_number) == "")
        )
        affected_count = null_serial_q.count()
        if affected_count > 0:
            examples = [r[0] for r in null_serial_q.limit(5).all()]
            findings.append(
                DataQualityFinding(
                    id=uuid.uuid4(),
                    run_id=run_id,
                    table_name="devices",
                    column_name="serial_number",
                    rule_name="DQ-001: Missing Serial Number",
                    severity="critical",
                    affected_rows=affected_count,
                    affected_percentage=round((affected_count / total_devices) * 100, 2),
                    example_identifiers=examples,
                    suggested_action="Perform physical audit or query SNMP sysObjectID/chassis inventory to populate chassis serial number.",
                )
            )

        return findings

    def _check_invalid_date_relationships(self, run_id: uuid.UUID) -> List[DataQualityFinding]:
        """Rule 2 (DQ-002): Identifies devices where warranty expiry date is earlier than installation date."""
        findings = []
        total_devices = self.db.query(func.count(Device.id)).scalar() or 1

        invalid_q = self.db.query(Device.asset_tag).filter(
            Device.warranty_expiry.is_not(None),
            Device.installed_at.is_not(None),
            Device.warranty_expiry < Device.installed_at,
        )
        affected_count = invalid_q.count()
        if affected_count > 0:
            examples = [r[0] for r in invalid_q.limit(5).all()]
            findings.append(
                DataQualityFinding(
                    id=uuid.uuid4(),
                    run_id=run_id,
                    table_name="devices",
                    column_name="warranty_expiry",
                    rule_name="DQ-002: Warranty Expiry Prior to Installation",
                    severity="critical",
                    affected_rows=affected_count,
                    affected_percentage=round((affected_count / total_devices) * 100, 2),
                    example_identifiers=examples,
                    suggested_action="Verify physical commission date against vendor coverage term. Inverted date sequences indicate erroneous warranty records.",
                )
            )

        return findings

    def _check_duplicate_serials(self, run_id: uuid.UUID) -> List[DataQualityFinding]:
        """Rule 3 (DQ-003): Identifies duplicate non-null serial numbers across hardware assets."""
        findings = []
        total_devices = self.db.query(func.count(Device.id)).scalar() or 1

        # Query normalized serial counts > 1
        dup_query = (
            self.db.query(
                func.trim(func.lower(Device.serial_number)).label("norm_sn"),
                func.count(Device.id).label("sn_cnt"),
            )
            .filter(Device.serial_number.is_not(None), func.trim(Device.serial_number) != "")
            .group_by("norm_sn")
            .having(func.count(Device.id) > 1)
            .all()
        )

        if dup_query:
            total_duplicate_rows = sum(r[1] for r in dup_query)
            sample_serials = [r[0].upper() for r in dup_query[:5]]
            findings.append(
                DataQualityFinding(
                    id=uuid.uuid4(),
                    run_id=run_id,
                    table_name="devices",
                    column_name="serial_number",
                    rule_name="DQ-003: Duplicate Hardware Serial Numbers",
                    severity="critical",
                    affected_rows=total_duplicate_rows,
                    affected_percentage=round((total_duplicate_rows / total_devices) * 100, 2),
                    example_identifiers=sample_serials,
                    suggested_action="Investigate hardware cloning or asset tagging overlap. Serial numbers must be globally unique per vendor chassis.",
                )
            )

        return findings

    def _check_category_inconsistencies(self, run_id: uuid.UUID) -> List[DataQualityFinding]:
        """Rule 4 (DQ-004): Identifies formatting/casing variants or unapproved device categories."""
        findings = []
        total_devices = self.db.query(func.count(Device.id)).scalar() or 1

        # Check for non-canonical casing or leading/trailing whitespace
        all_types = self.db.query(Device.device_type, Device.asset_tag).all()
        inconsistent_tags = []
        for raw_type, tag in all_types:
            if raw_type not in APPROVED_DEVICE_TYPES:
                inconsistent_tags.append(tag)

        if inconsistent_tags:
            findings.append(
                DataQualityFinding(
                    id=uuid.uuid4(),
                    run_id=run_id,
                    table_name="devices",
                    column_name="device_type",
                    rule_name="DQ-004: Inconsistent Device Category Formatting",
                    severity="medium",
                    affected_rows=len(inconsistent_tags),
                    affected_percentage=round((len(inconsistent_tags) / total_devices) * 100, 2),
                    example_identifiers=inconsistent_tags[:5],
                    suggested_action="Normalize device_type attribute to approved TitleCase vocabulary ('Switch', 'Router', 'Firewall', 'Access Point', 'Gateway').",
                )
            )

        return findings

    def _check_unexpected_status_values(self, run_id: uuid.UUID) -> List[DataQualityFinding]:
        """Rule 5 (DQ-005): Identifies devices with status values outside approved operational statuses."""
        findings = []
        total_devices = self.db.query(func.count(Device.id)).scalar() or 1

        # Check status outside APPROVED_STATUSES (normalized lower)
        all_statuses = self.db.query(Device.status, Device.asset_tag).all()
        unexpected_tags = []
        for raw_status, tag in all_statuses:
            norm_status = raw_status.strip().lower() if raw_status else ""
            if norm_status not in APPROVED_STATUSES:
                unexpected_tags.append(f"{tag} ({raw_status})")

        if unexpected_tags:
            findings.append(
                DataQualityFinding(
                    id=uuid.uuid4(),
                    run_id=run_id,
                    table_name="devices",
                    column_name="status",
                    rule_name="DQ-005: Unapproved Lifecycle Status Values",
                    severity="medium",
                    affected_rows=len(unexpected_tags),
                    affected_percentage=round((len(unexpected_tags) / total_devices) * 100, 2),
                    example_identifiers=unexpected_tags[:5],
                    suggested_action="Map ad-hoc status values ('staged', 'decommissioned_pending_audit') to standard lifecycle states ('active', 'inactive', 'maintenance', 'decommissioned').",
                )
            )

        return findings

    def _check_telemetry_range_violations(self, run_id: uuid.UUID) -> List[DataQualityFinding]:
        """Rule 6 (DQ-006): Identifies telemetry readings exceeding physically valid operating ranges."""
        findings = []
        total_telemetry = self.db.query(func.count(TelemetryReading.id)).scalar() or 1

        # Check invalid telemetry ranges
        invalid_telemetry_q = self.db.query(TelemetryReading.id).filter(
            (TelemetryReading.cpu_percent < 0.0)
            | (TelemetryReading.cpu_percent > 100.0)
            | (TelemetryReading.memory_percent < 0.0)
            | (TelemetryReading.memory_percent > 100.0)
            | (TelemetryReading.temperature_c < -40.0)
            | (TelemetryReading.temperature_c > 120.0)
            | (TelemetryReading.packet_loss_percent < 0.0)
            | (TelemetryReading.packet_loss_percent > 100.0)
            | (TelemetryReading.latency_ms < 0.0)
        )

        affected_count = invalid_telemetry_q.count()
        if affected_count > 0:
            examples = [f"Reading #{r[0]}" for r in invalid_telemetry_q.limit(5).all()]
            findings.append(
                DataQualityFinding(
                    id=uuid.uuid4(),
                    run_id=run_id,
                    table_name="telemetry_readings",
                    column_name="cpu/memory/temp/latency",
                    rule_name="DQ-006: Telemetry Out-of-Bounds Range Violations",
                    severity="high",
                    affected_rows=affected_count,
                    affected_percentage=round((affected_count / total_telemetry) * 100, 2),
                    example_identifiers=examples,
                    suggested_action="Recalibrate streaming telemetry ingestion sensors to drop or clamp mathematically impossible metrics.",
                )
            )

        return findings
