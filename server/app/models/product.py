from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import EmailStr, Field, field_validator

from app.models.common import MongoModel, PyObjectId, utcnow


class EmailMode(str, Enum):
    """How report emails should be delivered for a given product.

    ``SEND``  — actually send via Gmail.
    ``DRAFT`` — create a Gmail draft only (safe default for new products).
    """

    SEND = "send"
    DRAFT = "draft"


class ProductBase(MongoModel):
    productName: str = Field(min_length=1, max_length=120)
    playstoreAppId: Optional[str] = None
    appstoreAppId: Optional[str] = None
    googleDocId: Optional[str] = None
    emailTo: Optional[EmailStr] = None
    lookbackWeeks: int = Field(default=12, ge=1, le=52)
    # Default to DRAFT so a newly-created product can never silently spam
    # the recipient before the operator has reviewed at least one run.
    emailMode: EmailMode = EmailMode.DRAFT

    @field_validator("productName")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("productName cannot be empty")
        return v


class ProductCreate(ProductBase):
    pass


class ProductUpdate(MongoModel):
    productName: Optional[str] = Field(default=None, min_length=1, max_length=120)
    playstoreAppId: Optional[str] = None
    appstoreAppId: Optional[str] = None
    googleDocId: Optional[str] = None
    emailTo: Optional[EmailStr] = None
    lookbackWeeks: Optional[int] = Field(default=None, ge=1, le=52)
    # None => "don't touch"; any other value patches the stored mode.
    # Pydantic enforces it's one of the EmailMode members (422 on bad input).
    emailMode: Optional[EmailMode] = None


class Product(ProductBase):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    userId: PyObjectId
    createdAt: datetime = Field(default_factory=utcnow)
    updatedAt: datetime = Field(default_factory=utcnow)


class ProductPublic(ProductBase):
    id: str
    userId: str
    createdAt: datetime
    updatedAt: datetime

    @classmethod
    def from_product(cls, p: Product) -> "ProductPublic":
        return cls(
            id=str(p.id),
            userId=str(p.userId),
            productName=p.productName,
            playstoreAppId=p.playstoreAppId,
            appstoreAppId=p.appstoreAppId,
            googleDocId=p.googleDocId,
            emailTo=p.emailTo,
            lookbackWeeks=p.lookbackWeeks,
            emailMode=p.emailMode,
            createdAt=p.createdAt,
            updatedAt=p.updatedAt,
        )
