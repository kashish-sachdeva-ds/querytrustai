from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_tag = Column(String(64), unique=True, nullable=False, index=True)
    device_type = Column(String(64), nullable=False, index=True)
    vendor = Column(String(64), nullable=False)
    model = Column(String(128), nullable=False)
    firmware_version = Column(String(64), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False, index=True)
    status = Column(String(64), nullable=False, index=True)
    installed_at = Column(Date, nullable=False)
    warranty_expiry = Column(Date, nullable=True, index=True)
    serial_number = Column(String(128), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    site = relationship("Site", back_populates="devices")
    service_events = relationship("ServiceEvent", back_populates="device", cascade="all, delete-orphan")
    telemetry_readings = relationship("TelemetryReading", back_populates="device", cascade="all, delete-orphan")
