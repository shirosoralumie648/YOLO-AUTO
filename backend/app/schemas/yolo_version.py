from pydantic import BaseModel
from typing import Optional, Any

# Shared properties
class YoloVersionBase(BaseModel):
    name: str
    repo_url: Optional[str] = None
    default_input_size: Optional[str] = "640x640"
    performance_metrics: Optional[dict] = None
    config_schema: Optional[dict] = None

# Properties to receive on item creation
class YoloVersionCreate(YoloVersionBase):
    pass

# Properties to receive on item update
class YoloVersionUpdate(YoloVersionBase):
    pass

# Properties shared by models stored in DB
class YoloVersionInDBBase(YoloVersionBase):
    id: int

    class Config:
        orm_mode = True

# Properties to return to client
class YoloVersion(YoloVersionInDBBase):
    pass

# Properties stored in DB
class YoloVersionInDB(YoloVersionInDBBase):
    pass
