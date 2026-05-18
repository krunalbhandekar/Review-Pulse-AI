"""Google OAuth client using Authlib's async OAuth client.

Two surfaces:

* ``build_authorize_url`` / ``exchange_code`` — used by the login route.
* ``ensure_fresh_access_token`` — used by anything that needs to call a
  Google API on behalf of a user. Reads the stored connection, refreshes
  if expired, persists the refreshed token back to MongoDB.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client

from app.config import (
    GOOGLE_AUTH_URL,
    GOOGLE_OAUTH_SCOPES,
    GOOGLE_TOKEN_URL,
    GOOGLE_USERINFO_URL,
    settings,
)
from app.models.google_connection import GoogleConnection
from app.repositories.google_connection_repo import GoogleConnectionRepository
from app.utils.errors import GoogleAuthError
from app.utils.logging import get_logger

log = get_logger("service.google_oauth")


def _client() -> AsyncOAuth2Client:
    if not settings.google_client_id or not settings.google_client_secret:
        raise GoogleAuthError(
            "Google OAuth is not configured (missing GOOGLE_CLIENT_ID/SECRET)"
        )
    return AsyncOAuth2Client(
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scope=" ".join(GOOGLE_OAUTH_SCOPES),
        redirect_uri=settings.google_redirect_uri,
    )


async def build_authorize_url(state: str) -> str:
    """Return the URL we redirect the browser to for consent."""
    async with _client() as client:
        url, _ = client.create_authorization_url(
            GOOGLE_AUTH_URL,
            state=state,
            access_type="offline",       # we want a refresh token
            prompt="consent",            # ensure refresh_token on re-consent
            include_granted_scopes="true",
        )
        return url


async def exchange_code(*, code: str, state: str | None = None) -> dict[str, Any]:
    """Exchange the auth ``code`` for an access + refresh token pair."""
    async with _client() as client:
        token = await client.fetch_token(
            GOOGLE_TOKEN_URL,
            code=code,
            grant_type="authorization_code",
            state=state,
        )
    return dict(token)


async def fetch_userinfo(access_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()


def _expiry_from_token(token: dict[str, Any]) -> datetime:
    """Authlib returns either ``expires_at`` (unix seconds) or ``expires_in``."""
    if "expires_at" in token:
        return datetime.fromtimestamp(token["expires_at"], tz=timezone.utc)
    expires_in = int(token.get("expires_in", 3600))
    return datetime.now(timezone.utc) + timedelta(seconds=expires_in)


async def ensure_fresh_access_token(
    connection: GoogleConnection,
    *,
    repo: GoogleConnectionRepository | None = None,
    skew_seconds: int = 60,
) -> str:
    """Return a valid access token, refreshing it transparently if needed.

    ``skew_seconds`` is a safety buffer so we refresh tokens that are
    about to expire mid-request rather than failing partway through.
    """
    now = datetime.now(timezone.utc)
    expiry = connection.expiryDate
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)

    if expiry - timedelta(seconds=skew_seconds) > now:
        return connection.accessToken

    if not connection.refreshToken:
        raise GoogleAuthError(
            "Access token expired and no refresh token is stored. "
            "User must re-authenticate."
        )

    log.info("google.token.refreshing", user_id=str(connection.userId))
    async with _client() as client:
        try:
            new_token = await client.refresh_token(
                GOOGLE_TOKEN_URL,
                refresh_token=connection.refreshToken,
            )
        except Exception as exc:  # noqa: BLE001 — authlib raises various types
            log.error("google.token.refresh_failed", error=str(exc))
            raise GoogleAuthError("Failed to refresh Google access token") from exc

    access_token = new_token["access_token"]
    expiry = _expiry_from_token(dict(new_token))
    repo = repo or GoogleConnectionRepository()
    await repo.update_access_token(
        user_id=connection.userId,
        access_token=access_token,
        expiry_date=expiry,
    )
    return access_token


def parse_token_response(token: dict[str, Any]) -> dict[str, Any]:
    """Normalise an Authlib token dict into the fields we store."""
    return {
        "access_token": token["access_token"],
        "refresh_token": token.get("refresh_token"),
        "expiry_date": _expiry_from_token(token),
        "scope": token.get("scope"),
        "token_type": token.get("token_type", "Bearer"),
    }
