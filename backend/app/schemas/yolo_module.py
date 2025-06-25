from pydantic import BaseModel
from typing import Optional

# Shared properties
class YoloModuleBase(BaseModel):
    name: str
    module_type: str
    config_path: Optional[str] = None
    yolo_version_id: int

# Properties to receive on item creation
class YoloModuleCreate(YoloModuleBase):
    pass

# Properties to receive on item update
class YoloModuleUpdate(YoloModuleBase):
    pass

# Properties shared by models stored in DB
class YoloModuleInDBBase(YoloModuleBase):
    id: int

    class Config:
        orm_mode = True

# Properties to return to client
class YoloModule(YoloModuleInDBBase):
    pass

# Properties stored in DB
class YoloModuleInDB(YoloModuleInDBBase):
    pass
