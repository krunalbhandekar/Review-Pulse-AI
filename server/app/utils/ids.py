"""ObjectId helpers — keep ObjectId leakage contained to this module."""

from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId

from app.utils.errors import ValidationError


def to_object_id(value: str, *, field: str = "id") -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError) as exc:
        raise ValidationError(f"Invalid {field}: {value!r}") from exc


def oid_str(value: ObjectId | str | None) -> str | None:
    if value is None:
        return None
    return str(value)
