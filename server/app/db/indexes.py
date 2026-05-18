"""Index management — declarative, idempotent.

Called once at startup. ``create_index`` is a no-op if the index already
exists, so it is safe to re-run on every boot.
"""

from __future__ import annotations

from pymongo import ASCENDING, DESCENDING, IndexModel

from app.config import Collections
from app.db.mongo import get_db
from app.utils.logging import get_logger

log = get_logger("db.indexes")


async def ensure_indexes() -> None:
    db = get_db()

    await db[Collections.USERS].create_indexes([
        IndexModel([("googleId", ASCENDING)], unique=True, name="uniq_googleId"),
        IndexModel([("email", ASCENDING)], unique=True, name="uniq_email"),
    ])

    await db[Collections.GOOGLE_CONNECTIONS].create_indexes([
        IndexModel([("userId", ASCENDING)], unique=True, name="uniq_userId"),
    ])

    # productName must be unique per user (NOT globally). Compound unique
    # index on (userId, productName) gives us exactly that semantic.
    await db[Collections.PRODUCTS].create_indexes([
        IndexModel(
            [("userId", ASCENDING), ("productName", ASCENDING)],
            unique=True,
            name="uniq_user_productName",
        ),
        IndexModel([("userId", ASCENDING)], name="by_userId"),
    ])

    await db[Collections.SCHEDULES].create_indexes([
        IndexModel([("productId", ASCENDING)], name="by_productId"),
        IndexModel([("userId", ASCENDING)], name="by_userId"),
        IndexModel([("enabled", ASCENDING), ("nextRunAt", ASCENDING)],
                   name="enabled_nextRunAt"),
    ])

    await db[Collections.REPORTS].create_indexes([
        IndexModel([("userId", ASCENDING), ("generatedAt", DESCENDING)],
                   name="user_generatedAt"),
        IndexModel([("productId", ASCENDING), ("generatedAt", DESCENDING)],
                   name="product_generatedAt"),
    ])

    await db[Collections.JOB_RUNS].create_indexes([
        IndexModel([("scheduleId", ASCENDING), ("startedAt", DESCENDING)],
                   name="schedule_startedAt"),
    ])

    log.info("mongo.indexes_ensured")
