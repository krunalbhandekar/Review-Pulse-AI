"""Google OAuth login + session lifecycle.

Flow
----
1. ``GET /auth/google/login``    → redirects browser to Google's consent screen.
2. ``GET /auth/google/callback`` → Google redirects here with ``code``.
   We exchange the code, upsert the User, persist the GoogleConnection,
   set ``request.session["user_id"]``, then redirect to the frontend.
3. ``POST /auth/logout``         → clears the session cookie.
4. ``GET  /auth/me``             → returns the current user JSON (or 401).
"""

from __future__ import annotations

import secrets
from typing import Annotated

from urllib.parse import urlencode, urlparse, urlunparse

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.deps import CurrentUser, google_connection_repo, user_repo
from app.config import settings
from app.models.user import UserPublic
from app.repositories.google_connection_repo import GoogleConnectionRepository
from app.repositories.user_repo import UserRepository
from app.services import google_oauth
from app.utils.errors import GoogleAuthError
from app.utils.logging import get_logger

log = get_logger("api.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


def _login_redirect_with_error(reason: str) -> RedirectResponse:
    """Bounce back to the frontend login page with an ``?error=`` query.

    OAuth failures on the callback would otherwise render the API's JSON
    error page (which the user can't recover from) and trap them outside
    the SPA. By redirecting back to the frontend we keep the user in the
    app and let the login page surface a human-readable message.
    """
    parsed = urlparse(settings.post_logout_redirect or settings.post_login_redirect)
    target = urlunparse(
        parsed._replace(path="/login", query=urlencode({"error": reason}))
    )
    return RedirectResponse(url=target)


@router.get("/google/login")
async def google_login(request: Request) -> RedirectResponse:
    state = secrets.token_urlsafe(24)
    request.session["oauth_state"] = state
    url = await google_oauth.build_authorize_url(state=state)
    log.info("auth.google.login_initiated")
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: Annotated[str | None, Query()] = None,
    state: Annotated[str | None, Query()] = None,
    error: Annotated[str | None, Query()] = None,
    users: Annotated[UserRepository, Depends(user_repo)] = ...,
    connections: Annotated[
        GoogleConnectionRepository, Depends(google_connection_repo)
    ] = ...,
) -> RedirectResponse:
    if error:
        log.warning("auth.google.callback_error", error=error)
        return _login_redirect_with_error(error)
    if not code:
        log.warning("auth.google.callback_missing_code")
        return _login_redirect_with_error("missing_code")

    expected_state = request.session.pop("oauth_state", None)
    if not expected_state or state != expected_state:
        # Most often caused by the user opening a stale Google consent tab
        # whose state cookie has since rotated, or by third-party-cookie
        # blockers stripping the session cookie on the cross-site hop.
        # Either way, recovery is "restart the flow", not a 4xx page.
        log.warning("auth.google.state_mismatch")
        return _login_redirect_with_error("state_mismatch")

    token = await google_oauth.exchange_code(code=code, state=state)
    profile = await google_oauth.fetch_userinfo(token["access_token"])

    user = await users.upsert_from_google(
        google_id=profile["sub"],
        email=profile["email"],
        name=profile.get("name") or profile["email"],
        picture=profile.get("picture"),
    )

    parsed = google_oauth.parse_token_response(token)
    await connections.upsert(
        user_id=user.id,
        access_token=parsed["access_token"],
        refresh_token=parsed["refresh_token"],
        expiry_date=parsed["expiry_date"],
        scope=parsed["scope"],
        token_type=parsed["token_type"],
    )

    request.session["user_id"] = str(user.id)
    log.info("auth.google.login_success", user_id=str(user.id))
    return RedirectResponse(url=settings.post_login_redirect)


@router.post("/logout")
async def logout(request: Request) -> JSONResponse:
    request.session.clear()
    return JSONResponse({"status": "ok"})


@router.get("/me", response_model=UserPublic)
async def me(user: CurrentUser) -> UserPublic:
    return UserPublic.from_user(user)
