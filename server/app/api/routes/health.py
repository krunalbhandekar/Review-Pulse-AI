from fastapi import APIRouter

from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": settings.app.APP_NAME,
        "version": settings.app.APP_VERSION,
        "production": settings.is_production,
    }
