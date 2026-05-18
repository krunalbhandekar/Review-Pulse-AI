"""MCP service entry point."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import router as api_router
from app.auth.token_store import TokenStore
from app.config import settings
from app.utils.logging import configure_logging, get_logger


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    log = get_logger("mcp.lifecycle")
    log.info(
        "mcp.startup",
        app=settings.app.APP_NAME,
        is_production=settings.is_production,
        mongodb_db=settings.mongodb_db_name,
        google_oauth_configured=bool(settings.google_client_id),
        shared_secret_configured=bool(settings.mcp_shared_secret),
    )
    await TokenStore.connect()
    try:
        yield
    finally:
        log.info("mcp.shutdown")
        await TokenStore.close()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app.APP_NAME,
        version=settings.app.APP_VERSION,
        lifespan=lifespan,
    )
    app.include_router(api_router)
    return app


app = create_app()
