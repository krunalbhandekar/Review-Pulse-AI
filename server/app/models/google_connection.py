from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import Field

from app.models.common import MongoModel, PyObjectId, utcnow


class GoogleConnection(MongoModel):
    """Per-user Google OAuth tokens.

    These are the source of truth for both the server and the MCP service.
    Refresh tokens are obtained on first consent (``access_type=offline``)
    and reused; access tokens are short-lived and refreshed on demand.
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    userId: PyObjectId
    accessToken: str
    refreshToken: Optional[str] = None
    expiryDate: datetime
    scope: Optional[str] = None
    tokenType: str = "Bearer"
    updatedAt: datetime = Field(default_factory=utcnow)
