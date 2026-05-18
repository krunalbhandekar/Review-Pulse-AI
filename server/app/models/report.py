from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import Field

from app.models.common import MongoModel, PyObjectId, utcnow


class ReportStatus(str, Enum):
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class Report(MongoModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    productId: PyObjectId
    userId: PyObjectId
    scheduleId: Optional[PyObjectId] = None
    reportTitle: str
    summary: str = ""
    googleDocUrl: Optional[str] = None
    googleDocId: Optional[str] = None
    reviewCount: int = 0
    status: ReportStatus = ReportStatus.SUCCESS
    generatedAt: datetime = Field(default_factory=utcnow)
    deliveryMeta: dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


class ReportPublic(MongoModel):
    id: str
    productId: str
    userId: str
    scheduleId: Optional[str] = None
    reportTitle: str
    summary: str
    googleDocUrl: Optional[str]
    googleDocId: Optional[str]
    reviewCount: int
    status: ReportStatus
    generatedAt: datetime
    deliveryMeta: dict[str, Any]
    error: Optional[str] = None

    @classmethod
    def from_report(cls, r: Report) -> "ReportPublic":
        return cls(
            id=str(r.id),
            productId=str(r.productId),
            userId=str(r.userId),
            scheduleId=str(r.scheduleId) if r.scheduleId else None,
            reportTitle=r.reportTitle,
            summary=r.summary,
            googleDocUrl=r.googleDocUrl,
            googleDocId=r.googleDocId,
            reviewCount=r.reviewCount,
            status=r.status,
            generatedAt=r.generatedAt,
            deliveryMeta=r.deliveryMeta,
            error=r.error,
        )
