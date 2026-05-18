from __future__ import annotations

from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import Collections
from app.db import get_db
from app.models.common import utcnow
from app.models.user import User


class UserRepository:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None) -> None:
        self._db = db or get_db()
        self._col = self._db[Collections.USERS]

    async def get_by_id(self, user_id: ObjectId | str) -> Optional[User]:
        oid = user_id if isinstance(user_id, ObjectId) else ObjectId(user_id)
        doc = await self._col.find_one({"_id": oid})
        return User(**doc) if doc else None

    async def get_by_google_id(self, google_id: str) -> Optional[User]:
        doc = await self._col.find_one({"googleId": google_id})
        return User(**doc) if doc else None

    async def get_by_email(self, email: str) -> Optional[User]:
        doc = await self._col.find_one({"email": email})
        return User(**doc) if doc else None

    async def upsert_from_google(
        self,
        *,
        google_id: str,
        email: str,
        name: str,
        picture: Optional[str],
    ) -> User:
        now = utcnow()
        result = await self._col.find_one_and_update(
            {"googleId": google_id},
            {
                "$set": {
                    "email": email,
                    "name": name,
                    "picture": picture,
                    "updatedAt": now,
                },
                "$setOnInsert": {
                    "googleId": google_id,
                    "createdAt": now,
                },
            },
            upsert=True,
            return_document=True,
        )
        return User(**result)
