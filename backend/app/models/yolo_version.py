from sqlalchemy import Column, Integer, String, Text

from app.db.base_class import Base


class YoloVersion(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False, unique=True)
    description = Column(String, nullable=True)
    architecture = Column(Text, nullable=True)  # To store the full YAML content

