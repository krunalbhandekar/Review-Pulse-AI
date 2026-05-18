"""Pydantic v2 base for MongoDB-backed models."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any

from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field


def _validate_object_id(v: Any) -> ObjectId:
    if isinstance(v, ObjectId):
        return v
    if isinstance(v, str) and ObjectId.is_valid(v):
        return ObjectId(v)
    raise ValueError("Invalid ObjectId")


PyObjectId = Annotated[ObjectId, BeforeValidator(_validate_object_id)]


class MongoModel(BaseModel):
    """Shared base — arbitrary types so ``ObjectId`` can be a field type."""

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,
        json_encoders={ObjectId: str, datetime: lambda d: d.isoformat()},
    )


def utcnow() -> datetime:
    from datetime import timezone

    return datetime.now(timezone.utc)
