from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class TelemetryReading(Base):
    __tablename__ = "telemetry_readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False, index=True)
    recorded_at = Column(DateTime(timezone=True), nullable=False, index=True)
    cpu_percent = Column(Float, nullable=False)
    memory_percent = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=False)
    packet_loss_percent = Column(Float, nullable=False)
    latency_ms = Column(Float, nullable=False)
    known_injected_outlier = Column(Boolean, nullable=False, default=False)

    device = relationship("Device", back_populates="telemetry_readings")
