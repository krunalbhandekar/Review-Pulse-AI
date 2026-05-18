from __future__ import annotations

from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import Collections
from app.db import get_db
from app.models.report import Report
from app.utils.errors import NotFoundError


class ReportRepository:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None) -> None:
        self._db = db or get_db()
        self._col = self._db[Collections.REPORTS]

    async def create(self, report: Report) -> Report:
        doc = report.model_dump(by_alias=True, exclude={"id"})
        result = await self._col.insert_one(doc)
        report.id = result.inserted_id
        return report

    async def get(self, *, user_id: ObjectId, report_id: ObjectId) -> Report:
        doc = await self._col.find_one({"_id": report_id, "userId": user_id})
        if not doc:
            raise NotFoundError("Report not found")
        return Report(**doc)

    async def list_for_user(
        self,
        user_id: ObjectId,
        *,
        product_id: Optional[ObjectId] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> list[Report]:
        query: dict = {"userId": user_id}
        if product_id:
            query["productId"] = product_id
        cursor = (
            self._col.find(query)
            .sort("generatedAt", -1)
            .skip(skip)
            .limit(limit)
        )
        return [Report(**doc) async for doc in cursor]

    async def count_for_user(
        self, user_id: ObjectId, *, product_id: Optional[ObjectId] = None
    ) -> int:
        query: dict = {"userId": user_id}
        if product_id:
            query["productId"] = product_id
        return await self._col.count_documents(query)
