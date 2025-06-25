from app.crud.base import CRUDBase
from app.models.yolo_version import YoloModule
from app.schemas.yolo_module import YoloModuleCreate, YoloModuleUpdate

class CRUDYoloModule(CRUDBase[YoloModule, YoloModuleCreate, YoloModuleUpdate]):
    pass

yolo_module = CRUDYoloModule(YoloModule)
