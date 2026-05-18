"""Async MongoDB connection using Motor.

The database name is parsed from ``MONGODB_URI``; there is no separate
``MONGODB_DB`` env var. The URI **must** include the DB segment, e.g.::

    mongodb+srv://user:pass@cluster.mongodb.net/mt_review_intelligence

A single ``AsyncIOMotorClient`` is created at startup and shared across
the process. ``get_db()`` returns the database handle; routes and
services should depend on the typed repositories
(``app.repositories.*``) rather than calling ``get_db`` directly.
"""

from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings
from app.utils.logging import get_logger

log = get_logger("db.mongo")


class _MongoState:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    if _MongoState.client is not None:
        return

    if not settings.mongodb_uri:
        raise RuntimeError("MONGODB_URI is not configured")

    db_name = settings.mongodb_db_name
    if not db_name:
        raise RuntimeError(
            "MONGODB_URI must include the database name "
            "(e.g. mongodb+srv://.../mt_review_intelligence)"
        )

    log.info("mongo.connecting", db=db_name)
    _MongoState.client = AsyncIOMotorClient(
        settings.mongodb_uri,
        uuidRepresentation="standard",
        tz_aware=True,
    )
    # ``get_default_database`` returns the DB embedded in the URI, which
    # is what we want — keeps the source of truth in one place.
    _MongoState.db = _MongoState.client.get_default_database()
    await _MongoState.client.admin.command("ping")
    log.info("mongo.connected", db=db_name)


async def close_mongo_connection() -> None:
    if _MongoState.client is None:
        return
    log.info("mongo.closing")
    _MongoState.client.close()
    _MongoState.client = None
    _MongoState.db = None


def get_db() -> AsyncIOMotorDatabase:
    if _MongoState.db is None:
        raise RuntimeError(
            "MongoDB is not connected. Call connect_to_mongo() on startup."
        )
    return _MongoState.db
