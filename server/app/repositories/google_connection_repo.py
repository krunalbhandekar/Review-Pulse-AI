from __future__ import annotations

from datetime import datetime
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import Collections
from app.db import get_db
from app.models.common import utcnow
from app.models.google_connection import GoogleConnection


class GoogleConnectionRepository:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None) -> None:
        self._db = db or get_db()
        self._col = self._db[Collections.GOOGLE_CONNECTIONS]

    async def get_by_user(self, user_id: ObjectId | str) -> Optional[GoogleConnection]:
        oid = user_id if isinstance(user_id, ObjectId) else ObjectId(user_id)
        doc = await self._col.find_one({"userId": oid})
        return GoogleConnection(**doc) if doc else None

    async def upsert(
        self,
        *,
        user_id: ObjectId,
        access_token: str,
        refresh_token: Optional[str],
        expiry_date: datetime,
        scope: Optional[str] = None,
        token_type: str = "Bearer",
    ) -> GoogleConnection:
        update = {
            "accessToken": access_token,
            "expiryDate": expiry_date,
            "scope": scope,
            "tokenType": token_type,
            "updatedAt": utcnow(),
        }
        # Only overwrite refreshToken if Google actually returned one
        # (subsequent refreshes typically omit it).
        if refresh_token:
            update["refreshToken"] = refresh_token

        result = await self._col.find_one_and_update(
            {"userId": user_id},
            {"$set": update, "$setOnInsert": {"userId": user_id}},
            upsert=True,
            return_document=True,
        )
        return GoogleConnection(**result)

    async def update_access_token(
        self,
        *,
        user_id: ObjectId,
        access_token: str,
        expiry_date: datetime,
    ) -> None:
        await self._col.update_one(
            {"userId": user_id},
            {
                "$set": {
                    "accessToken": access_token,
                    "expiryDate": expiry_date,
                    "updatedAt": utcnow(),
                }
            },
        )

    async def delete(self, user_id: ObjectId) -> None:
        await self._col.delete_one({"userId": user_id})
