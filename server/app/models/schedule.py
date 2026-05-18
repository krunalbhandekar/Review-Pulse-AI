from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import Field, field_validator

from app.models.common import MongoModel, PyObjectId, utcnow


class Frequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    CUSTOM = "custom"


_WEEKDAYS = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}


class ScheduleBase(MongoModel):
    frequency: Frequency = Frequency.WEEKLY
    # For weekly: a single day. For custom: a list of days. For daily: ignored.
    dayOfWeek: Optional[str] = "monday"
    daysOfWeek: Optional[list[str]] = None
    time: str = Field(default="06:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    timezone: str = "Asia/Kolkata"
    enabled: bool = True

    @field_validator("dayOfWeek")
    @classmethod
    def _validate_day(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.lower()
        if v not in _WEEKDAYS:
            raise ValueError(f"dayOfWeek must be one of {sorted(_WEEKDAYS)}")
        return v

    @field_validator("daysOfWeek")
    @classmethod
    def _validate_days(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is None:
            return v
        normalised = [d.lower() for d in v]
        for d in normalised:
            if d not in _WEEKDAYS:
                raise ValueError(f"daysOfWeek entries must be in {sorted(_WEEKDAYS)}")
        return normalised


class ScheduleCreate(ScheduleBase):
    productId: str


class ScheduleUpdate(MongoModel):
    frequency: Optional[Frequency] = None
    dayOfWeek: Optional[str] = None
    daysOfWeek: Optional[list[str]] = None
    time: Optional[str] = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    timezone: Optional[str] = None
    enabled: Optional[bool] = None


class Schedule(ScheduleBase):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    productId: PyObjectId
    userId: PyObjectId
    nextRunAt: Optional[datetime] = None
    lastRunAt: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=utcnow)
    updatedAt: datetime = Field(default_factory=utcnow)


class SchedulePublic(ScheduleBase):
    id: str
    productId: str
    userId: str
    nextRunAt: Optional[datetime] = None
    lastRunAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    @classmethod
    def from_schedule(cls, s: Schedule) -> "SchedulePublic":
        return cls(
            id=str(s.id),
            productId=str(s.productId),
            userId=str(s.userId),
            frequency=s.frequency,
            dayOfWeek=s.dayOfWeek,
            daysOfWeek=s.daysOfWeek,
            time=s.time,
            timezone=s.timezone,
            enabled=s.enabled,
            nextRunAt=s.nextRunAt,
            lastRunAt=s.lastRunAt,
            createdAt=s.createdAt,
            updatedAt=s.updatedAt,
        )
