from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    site_code = Column(String(64), unique=True, nullable=False, index=True)
    site_name = Column(String(255), nullable=False)
    city = Column(String(128), nullable=False)
    region = Column(String(64), nullable=False, index=True)

    devices = relationship("Device", back_populates="site", cascade="all, delete-orphan")
