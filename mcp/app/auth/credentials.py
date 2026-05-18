"""Convert a stored token doc into a ``google.oauth2.Credentials`` object.

The Google Python client refreshes access tokens automatically when
``refresh_token`` is present and ``client_id``/``client_secret`` are set
on the credentials object. We listen for that refresh by passing a
``Request`` and persist the new access token back to MongoDB.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from fastapi import HTTPException
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials

from app.auth.token_store import TokenStore
from app.config import settings
from app.utils.logging import get_logger

log = get_logger("auth.credentials")


async def build_credentials(user_id: str) -> Credentials:
    """Return live Google credentials for ``user_id``, refreshing if needed."""
    conn = await TokenStore.get_user_connection(user_id)
    if not conn:
        raise HTTPException(
            status_code=401,
            detail=f"No Google connection found for user_id={user_id}",
        )

    access_token = conn.get("accessToken")
    refresh_token = conn.get("refreshToken")
    expiry = conn.get("expiryDate")

    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Stored Google connection is missing accessToken",
        )

    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=503,
            detail="MCP missing GOOGLE_CLIENT_ID/SECRET; cannot refresh tokens",
        )

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        token_uri=settings.google.TOKEN_URL,
        scopes=list(settings.google.SCOPES),
    )
    # google-auth uses naive datetimes for ``expiry``. Strip tz if present.
    if isinstance(expiry, datetime):
        creds.expiry = expiry.replace(tzinfo=None) if expiry.tzinfo else expiry

    if not creds.valid:
        if not creds.refresh_token:
            raise HTTPException(
                status_code=401,
                detail="Access token expired and no refresh token stored",
            )
        # google-auth refresh is sync; run it off the event loop.
        await asyncio.to_thread(_refresh_in_place, creds)
        await TokenStore.update_access_token(
            user_id=user_id,
            access_token=creds.token,
            expiry_date=(
                creds.expiry.replace(tzinfo=timezone.utc)
                if creds.expiry else datetime.now(timezone.utc)
            ),
        )
        log.info("google.token.refreshed", user_id=user_id)

    return creds


def _refresh_in_place(creds: Credentials) -> None:
    creds.refresh(GoogleRequest())
