"""Read + write per-user Google tokens in MongoDB.

The server is the canonical writer (it runs the OAuth callback). The MCP
service reads + occasionally writes back refreshed access tokens so
subsequent calls don't have to re-refresh.

Tokens are never cached in-process — every request fetches fresh state,
so revoked sessions stop working immediately.

The database name is parsed from ``MONGODB_URI`` (which must embed it,
e.g. ``mongodb+srv://.../mt_review_intelligence``); there is no separate
``MONGODB_DB`` env var.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import Collections, settings
from app.utils.logging import get_logger

log = get_logger("auth.token_store")


class TokenStore:
    """Lazy-singleton wrapper around the shared Mongo connection."""

    _client: AsyncIOMotorClient | None = None
    _db: AsyncIOMotorDatabase | None = None

    @classmethod
    async def connect(cls) -> None:
        if cls._client is not None:
            return
        if not settings.mongodb_uri:
            raise RuntimeError("MONGODB_URI is not configured")
        if not settings.mongodb_db_name:
            raise RuntimeError(
                "MONGODB_URI must include the database name "
                "(e.g. mongodb+srv://.../mt_review_intelligence)"
            )
        cls._client = AsyncIOMotorClient(
            settings.mongodb_uri,
            uuidRepresentation="standard",
            tz_aware=True,
        )
        cls._db = cls._client.get_default_database()
        await cls._client.admin.command("ping")
        log.info("mongo.connected", db=settings.mongodb_db_name)

    @classmethod
    async def close(cls) -> None:
        if cls._client is None:
            return
        cls._client.close()
        cls._client = None
        cls._db = None

    @classmethod
    def db(cls) -> AsyncIOMotorDatabase:
        if cls._db is None:
            raise RuntimeError("TokenStore is not connected")
        return cls._db

    @classmethod
    async def get_user_connection(cls, user_id: str) -> Optional[dict]:
        """Return the ``google_connections`` doc for ``user_id``."""
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        doc = await cls.db()[Collections.GOOGLE_CONNECTIONS].find_one({"userId": oid})
        return doc

    @classmethod
    async def update_access_token(
        cls,
        *,
        user_id: str,
        access_token: str,
        expiry_date: datetime,
    ) -> None:
        await cls.db()[Collections.GOOGLE_CONNECTIONS].update_one(
            {"userId": ObjectId(user_id)},
            {
                "$set": {
                    "accessToken": access_token,
                    "expiryDate": expiry_date,
                    "updatedAt": datetime.now(timezone.utc),
                }
            },
        )

    @classmethod
    async def get_user_email(cls, user_id: str) -> Optional[str]:
        doc = await cls.db()[Collections.USERS].find_one({"_id": ObjectId(user_id)})
        return doc.get("email") if doc else None
