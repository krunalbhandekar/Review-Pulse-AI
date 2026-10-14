from fastapi import APIRouter

from app.config import settings
from app.integrations.mcp_client import probe_mcp

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": settings.app.APP_NAME,
        "version": settings.app.APP_VERSION,
        "production": settings.is_production,
    }


@router.get("/health/services")
async def services_health() -> dict:
    """Readiness of downstream services, for the frontend's status banner.

    Probing MCP also wakes it if Render has put it to sleep, so the
    frontend can poll this until ``mcp`` flips to ``"ok"``.
    """
    mcp_ok = await probe_mcp()
    return {"server": "ok", "mcp": "ok" if mcp_ok else "starting"}
