from typing import Optional

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.yolo_version import YoloVersion
from app.schemas.yolo_version import YoloVersionCreate, YoloVersionUpdate


class CRUDYoloVersion(CRUDBase[YoloVersion, YoloVersionCreate, YoloVersionUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[YoloVersion]:
        return db.query(YoloVersion).filter(YoloVersion.name == name).first()


yolo_version = CRUDYoloVersion(YoloVersion)
