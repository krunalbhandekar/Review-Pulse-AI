"""FastAPI entry point for the multi-tenant server."""

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
        version=settings.app.APP_VERSION,
        lifespan=lifespan,
    )

    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        session_cookie=settings.session.COOKIE_NAME,
        max_age=settings.session.MAX_AGE_SECONDS,
        same_site=settings.session.SAME_SITE,
        https_only=settings.is_production,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
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
