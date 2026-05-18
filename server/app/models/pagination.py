"""Shared pagination shapes for list endpoints.

Wire format (the user-facing spec):

    {
        "items": [...],
        "page": 1,
        "limit": 10,
        "total": 125,
        "total_pages": 13
    }

``total_pages`` is intentionally snake_case to match the frontend
contract; it's transport-level metadata, not a domain field.
"""

from __future__ import annotations

import math
from typing import Annotated, Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel, Field

T = TypeVar("T")

DEFAULT_PAGE_SIZE = 10
# Cap to keep a single page response bounded — prevents accidental
# unbounded scans from a misbehaving client. Bumped a little above the
# default to give the dashboard room to fetch its "recent activity"
# slice in one go.
MAX_PAGE_SIZE = 100


class Page(BaseModel, Generic[T]):
    """Generic paginated response envelope."""

    items: list[T]
    page: int = Field(ge=1)
    limit: int = Field(ge=1)
    total: int = Field(ge=0)
    total_pages: int = Field(ge=0)

    @classmethod
    def build(cls, *, items: list[T], page: int, limit: int, total: int) -> "Page[T]":
        # 0 items => 0 pages (not 1). This matches what most UIs want:
        # "Page 1 of 0" reads worse than just hiding the pager.
        total_pages = math.ceil(total / limit) if total else 0
        return cls(
            items=items,
            page=page,
            limit=limit,
            total=total,
            total_pages=total_pages,
        )


# FastAPI dependency-friendly query annotations. Used directly in route
# signatures so the validation + OpenAPI docs come for free.
PageQuery = Annotated[int, Query(ge=1, description="1-indexed page number")]
LimitQuery = Annotated[
    int,
    Query(
        ge=1,
        le=MAX_PAGE_SIZE,
        description=f"Items per page (max {MAX_PAGE_SIZE}).",
    ),
]


def skip_for(page: int, limit: int) -> int:
    """Convert a 1-indexed page + limit into a Mongo ``skip`` value."""
    return (page - 1) * limit


__all__ = [
    "DEFAULT_PAGE_SIZE",
    "MAX_PAGE_SIZE",
    "LimitQuery",
    "Page",
    "PageQuery",
    "skip_for",
]
