"""FastAPI entry point for the Review Pulse AI server (multi-tenant)."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware

from app.api.routes import auth, health, products, reports, schedules
from app.config import settings
from app.db import close_mongo_connection, connect_to_mongo
from app.db.indexes import ensure_indexes
from app.scheduler import shutdown_scheduler, start_scheduler
from app.utils.errors import AppError
from app.utils.logging import configure_logging, get_logger


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    log = get_logger("app.lifecycle")
    log.info(
        "app.startup",
        app=settings.app.APP_NAME,
        environment=settings.environment,
        is_production=settings.is_production,
        mongodb_db=settings.mongodb_db_name,
        google_oauth_configured=bool(settings.google_client_id),
        mcp_url=settings.mcp_server_url,
    )

    await connect_to_mongo()
    await ensure_indexes()
    start_scheduler()

    try:
        yield
    finally:
        log.info("app.shutdown")
        shutdown_scheduler()
        await close_mongo_connection()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app.APP_NAME,
        description="AI-Powered Product Review Intelligence — backend API.",
        version=settings.app.APP_VERSION,
        lifespan=lifespan,
    )

    # CORS must be added BEFORE SessionMiddleware so the CORS response
    # headers wrap every response, including those that set the session
    # cookie. Starlette runs middleware in reverse add-order — last added
    # runs first on the request, last on the response. Adding CORS last
    # here means it's the outermost layer on the response.
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        session_cookie=settings.session.COOKIE_NAME,
        max_age=settings.session.MAX_AGE_SECONDS,
        # In production we need SameSite=None + Secure so the browser
        # attaches the cookie on cross-origin fetches from the Vercel
        # frontend to the Render backend. Locally we stay on Lax.
        same_site=settings.session_same_site,
        https_only=settings.session_https_only,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        # The session cookie is HttpOnly so the frontend never reads it
        # directly, but Set-Cookie still needs to pass through CORS on
        # the OAuth callback response chain — exposing it is harmless and
        # avoids surprises if we ever add non-HttpOnly auxiliary cookies.
        expose_headers=["Content-Disposition"],
        max_age=600,
    )

    @app.exception_handler(AppError)
    async def _app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.code, "message": exc.message},
        )

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(products.router)
    app.include_router(schedules.router)
    app.include_router(reports.router)

    return app


app = create_app()
