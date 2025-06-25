from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class YoloVersion(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    repo_url = Column(String, nullable=True)
    default_input_size = Column(String, default="640x640")
    performance_metrics = Column(JSON, nullable=True)
    config_schema = Column(JSON, nullable=True)

    modules = relationship("YoloModule", back_populates="version")


class YoloModule(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    module_type = Column(String, index=True, nullable=False)  # e.g., backbone, neck, head
    config_path = Column(String, nullable=True)
    yolo_version_id = Column(Integer, ForeignKey("yoloversion.id"))
    version = relationship("YoloVersion", back_populates="modules")
    default_input_size = Column(String, default="640x640")
    # Store performance metrics like mAP, latency, etc. as a flexible JSON field
    performance_metrics = Column(JSON, nullable=True)
    # Store a schema for configurable parameters (e.g., for different backbones, necks)
    config_schema = Column(JSON, nullable=True)
