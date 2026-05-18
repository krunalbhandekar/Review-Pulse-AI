from __future__ import annotations

from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.config import Collections
from app.db import get_db
from app.models.common import utcnow
from app.models.product import Product, ProductCreate, ProductUpdate
from app.utils.errors import ConflictError, NotFoundError


class ProductRepository:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None) -> None:
        self._db = db or get_db()
        self._col = self._db[Collections.PRODUCTS]

    async def create(self, *, user_id: ObjectId, data: ProductCreate) -> Product:
        doc = {
            **data.model_dump(exclude_none=False),
            "userId": user_id,
            "createdAt": utcnow(),
            "updatedAt": utcnow(),
        }
        try:
            result = await self._col.insert_one(doc)
        except DuplicateKeyError as exc:
            raise ConflictError(
                f"You already have a product named {data.productName!r}"
            ) from exc
        doc["_id"] = result.inserted_id
        return Product(**doc)

    async def get(self, *, user_id: ObjectId, product_id: ObjectId) -> Product:
        doc = await self._col.find_one({"_id": product_id, "userId": user_id})
        if not doc:
            raise NotFoundError("Product not found")
        return Product(**doc)

    @staticmethod
    def _build_query(user_id: ObjectId, search: Optional[str]) -> dict:
        """Common filter for list + count — keeps the two in lockstep."""
        from app.models.pagination import search_regex

        query: dict = {"userId": user_id}
        if search:
            clause = search_regex(search)
            # Match any of the user-visible identity fields.
            query["$or"] = [
                {"productName": clause},
                {"playstoreAppId": clause},
                {"appstoreAppId": clause},
                {"emailTo": clause},
            ]
        return query

    async def list_for_user(
        self,
        user_id: ObjectId,
        *,
        skip: int = 0,
        limit: int = 0,
        search: Optional[str] = None,
        sort_field: str = "createdAt",
        sort_order: int = -1,
    ) -> list[Product]:
        # ``limit=0`` in Motor means "no limit" — preserved for the
        # handful of internal callers that still want the full set.
        cursor = self._col.find(self._build_query(user_id, search)).sort(
            sort_field, sort_order
        )
        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)
        return [Product(**doc) async for doc in cursor]

    async def count_for_user(
        self, user_id: ObjectId, *, search: Optional[str] = None
    ) -> int:
        return await self._col.count_documents(self._build_query(user_id, search))

    async def update(
        self, *, user_id: ObjectId, product_id: ObjectId, data: ProductUpdate
    ) -> Product:
        patch = {k: v for k, v in data.model_dump(exclude_none=True).items()}
        if not patch:
            return await self.get(user_id=user_id, product_id=product_id)
        patch["updatedAt"] = utcnow()
        try:
            doc = await self._col.find_one_and_update(
                {"_id": product_id, "userId": user_id},
                {"$set": patch},
                return_document=True,
            )
        except DuplicateKeyError as exc:
            raise ConflictError(
                "Another product with that name already exists"
            ) from exc
        if not doc:
            raise NotFoundError("Product not found")
        return Product(**doc)

    async def delete(self, *, user_id: ObjectId, product_id: ObjectId) -> None:
        result = await self._col.delete_one({"_id": product_id, "userId": user_id})
        if result.deleted_count == 0:
            raise NotFoundError("Product not found")
