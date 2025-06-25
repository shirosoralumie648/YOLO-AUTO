from typing import Optional

from pydantic import BaseModel


# Shared properties
class YoloVersionBase(BaseModel):
    name: str
    description: Optional[str] = None
    architecture: Optional[str] = None  # YAML content


# Properties to receive on item creation
class YoloVersionCreate(YoloVersionBase):
    name: str  # Make name required on creation


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

