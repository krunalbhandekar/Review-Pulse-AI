from __future__ import annotations

from datetime import datetime
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import Collections
from app.db import get_db
from app.models.common import utcnow
from app.models.schedule import Schedule, ScheduleCreate, ScheduleUpdate
from app.utils.errors import NotFoundError


class ScheduleRepository:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None) -> None:
        self._db = db or get_db()
        self._col = self._db[Collections.SCHEDULES]

    async def create(
        self,
        *,
        user_id: ObjectId,
        product_id: ObjectId,
        data: ScheduleCreate,
        next_run_at: Optional[datetime] = None,
    ) -> Schedule:
        payload = data.model_dump(exclude={"productId"})
        doc = {
            **payload,
            "productId": product_id,
            "userId": user_id,
            "nextRunAt": next_run_at,
            "lastRunAt": None,
            "createdAt": utcnow(),
            "updatedAt": utcnow(),
        }
        result = await self._col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return Schedule(**doc)

    async def get(self, *, user_id: ObjectId, schedule_id: ObjectId) -> Schedule:
        doc = await self._col.find_one({"_id": schedule_id, "userId": user_id})
        if not doc:
            raise NotFoundError("Schedule not found")
        return Schedule(**doc)

    async def get_internal(self, schedule_id: ObjectId) -> Optional[Schedule]:
        """Used by the scheduler dispatcher (no userId scoping)."""
        doc = await self._col.find_one({"_id": schedule_id})
        return Schedule(**doc) if doc else None

    @staticmethod
    def _build_query(
        user_id: ObjectId,
        *,
        product_id: Optional[ObjectId],
        enabled: Optional[bool],
    ) -> dict:
        query: dict = {"userId": user_id}
        if product_id is not None:
            query["productId"] = product_id
        if enabled is not None:
            query["enabled"] = enabled
        return query

    async def list_for_user(
        self,
        user_id: ObjectId,
        *,
        product_id: Optional[ObjectId] = None,
        enabled: Optional[bool] = None,
        sort_field: str = "createdAt",
        sort_order: int = -1,
        skip: int = 0,
        limit: int = 0,
    ) -> list[Schedule]:
        cursor = self._col.find(
            self._build_query(user_id, product_id=product_id, enabled=enabled)
        ).sort(sort_field, sort_order)
        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)
        return [Schedule(**doc) async for doc in cursor]

    async def list_for_product(
        self,
        *,
        user_id: ObjectId,
        product_id: ObjectId,
        enabled: Optional[bool] = None,
        sort_field: str = "createdAt",
        sort_order: int = -1,
        skip: int = 0,
        limit: int = 0,
    ) -> list[Schedule]:
        # Thin wrapper kept for the existing call site in the routes —
        # delegates to ``list_for_user`` so the filter logic lives in one
        # place.
        return await self.list_for_user(
            user_id,
            product_id=product_id,
            enabled=enabled,
            sort_field=sort_field,
            sort_order=sort_order,
            skip=skip,
            limit=limit,
        )

    async def count_for_user(
        self,
        user_id: ObjectId,
        *,
        product_id: Optional[ObjectId] = None,
        enabled: Optional[bool] = None,
    ) -> int:
        return await self._col.count_documents(
            self._build_query(user_id, product_id=product_id, enabled=enabled)
        )

    async def update(
        self,
        *,
        user_id: ObjectId,
        schedule_id: ObjectId,
        data: ScheduleUpdate,
    ) -> Schedule:
        patch = {k: v for k, v in data.model_dump(exclude_none=True).items()}
        if not patch:
            return await self.get(user_id=user_id, schedule_id=schedule_id)
        patch["updatedAt"] = utcnow()
        doc = await self._col.find_one_and_update(
            {"_id": schedule_id, "userId": user_id},
            {"$set": patch},
            return_document=True,
        )
        if not doc:
            raise NotFoundError("Schedule not found")
        return Schedule(**doc)

    async def delete(self, *, user_id: ObjectId, schedule_id: ObjectId) -> None:
        result = await self._col.delete_one({"_id": schedule_id, "userId": user_id})
        if result.deleted_count == 0:
            raise NotFoundError("Schedule not found")

    async def list_due(self, *, before: datetime) -> list[Schedule]:
        """Schedules eligible to run now. Used by the dispatcher loop."""
        cursor = self._col.find({
            "enabled": True,
            "nextRunAt": {"$lte": before},
        })
        return [Schedule(**doc) async for doc in cursor]

    async def mark_ran(
        self,
        *,
        schedule_id: ObjectId,
        last_run_at: datetime,
        next_run_at: Optional[datetime],
    ) -> None:
        await self._col.update_one(
            {"_id": schedule_id},
            {
                "$set": {
                    "lastRunAt": last_run_at,
                    "nextRunAt": next_run_at,
                    "updatedAt": utcnow(),
                }
            },
        )

    async def set_next_run(
        self, *, schedule_id: ObjectId, next_run_at: Optional[datetime]
    ) -> None:
        await self._col.update_one(
            {"_id": schedule_id},
            {"$set": {"nextRunAt": next_run_at, "updatedAt": utcnow()}},
        )

    async def delete_by_product(
        self, *, user_id: ObjectId, product_id: ObjectId
    ) -> int:
        result = await self._col.delete_many(
            {"userId": user_id, "productId": product_id}
        )
        return result.deleted_count
