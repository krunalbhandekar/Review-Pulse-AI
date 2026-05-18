from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import EmailStr, Field

from app.models.common import MongoModel, PyObjectId, utcnow


class User(MongoModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    email: EmailStr
    googleId: str
    picture: Optional[str] = None
    createdAt: datetime = Field(default_factory=utcnow)
    updatedAt: datetime = Field(default_factory=utcnow)


class UserPublic(MongoModel):
    """Shape returned to API clients — ObjectId stringified, no internal fields."""

    id: str
    name: str
    email: EmailStr
    picture: Optional[str] = None
    createdAt: datetime

    @classmethod
    def from_user(cls, user: User) -> "UserPublic":
        return cls(
            id=str(user.id),
            name=user.name,
            email=user.email,
            picture=user.picture,
            createdAt=user.createdAt,
        )
