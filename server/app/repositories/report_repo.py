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

    @staticmethod
    def _build_query(
        user_id: ObjectId,
        *,
        product_id: Optional[ObjectId],
        status: Optional[str],
        search: Optional[str],
    ) -> dict:
        from app.models.pagination import search_regex

        query: dict = {"userId": user_id}
        if product_id is not None:
            query["productId"] = product_id
        if status:
            # Plain equality; ReportStatus enum values are stored as
            # strings in Mongo (e.g. "success" | "partial" | "failed").
            query["status"] = status
        if search:
            query["reportTitle"] = search_regex(search)
        return query

    async def list_for_user(
        self,
        user_id: ObjectId,
        *,
        product_id: Optional[ObjectId] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        sort_field: str = "generatedAt",
        sort_order: int = -1,
        limit: int = 50,
        skip: int = 0,
    ) -> list[Report]:
        query = self._build_query(
            user_id, product_id=product_id, status=status, search=search
        )
        cursor = (
            self._col.find(query)
            .sort(sort_field, sort_order)
            .skip(skip)
            .limit(limit)
        )
        return [Report(**doc) async for doc in cursor]

    async def count_for_user(
        self,
        user_id: ObjectId,
        *,
        product_id: Optional[ObjectId] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> int:
        query = self._build_query(
            user_id, product_id=product_id, status=status, search=search
        )
        return await self._col.count_documents(query)
