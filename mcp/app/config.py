"""MCP settings.

Static knobs (app name, port, log level, collection names, Google
endpoints) live as code constants in this module. Only true secrets +
deployment-specific values come from ``.env`` (``_Secrets``).
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict


# ---------------------------------------------------------------------------
# Environment flag — single source of truth
# ---------------------------------------------------------------------------
# Mirrors server/app/config/settings.py: ``ENVIRONMENT`` is the only signal
# that decides production-ness. Anything other than the literal string
# ``PRODUCTION`` (case-insensitive) is treated as non-prod. Missing or
# blank => DEVELOPMENT.
ENVIRONMENT: str = (os.getenv("ENVIRONMENT") or "DEVELOPMENT").strip().upper() or "DEVELOPMENT"
IS_PRODUCTION: bool = ENVIRONMENT == "PRODUCTION"


# ---------------------------------------------------------------------------
# Static configs
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class AppConfig:
    """Service identity + runtime knobs."""

    # User-facing string for FastAPI's /docs and /health. Suffix
    # disambiguates from the main API server when both services'
    # Swagger pages are open side by side.
    APP_NAME: str = "Review Pulse AI — MCP"
    APP_VERSION: str = "0.1.0"
    PORT: int = 9000
    LOG_LEVEL: str = "INFO"


@dataclass(frozen=True)
class GoogleConfig:
    """Static Google API knobs. OAuth client *secrets* live on _Secrets."""

    TOKEN_URL: str = "https://oauth2.googleapis.com/token"
    SCOPES: tuple[str, ...] = (
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/gmail.send",
    )
    # Skew before expiry at which we proactively refresh.
    REFRESH_SKEW_SECONDS: int = 60


class Collections:
    """MongoDB collection names — must match the server's constants."""

    USERS = "users"
    GOOGLE_CONNECTIONS = "google_connections"


# ---------------------------------------------------------------------------
# Secrets / deployment-specific values
# ---------------------------------------------------------------------------


class _Secrets(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Same DB the server writes tokens into. URI **must** embed the DB name.
    mongodb_uri: str = ""

    # Same OAuth client the server uses (required to refresh tokens).
    google_client_id: str = ""
    google_client_secret: str = ""

    # Symmetric secret the server attaches as ``X-MCP-Secret``.
    mcp_shared_secret: str = ""


# ---------------------------------------------------------------------------
# Merged settings
# ---------------------------------------------------------------------------


def _extract_db_name(uri: str) -> str:
    if not uri:
        return ""
    path = urlparse(uri).path.lstrip("/")
    return path.split("?")[0].strip()


@dataclass(frozen=True)
class Settings:
    app: AppConfig = field(default_factory=AppConfig)
    google: GoogleConfig = field(default_factory=GoogleConfig)

    # Secrets
    mongodb_uri: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    mcp_shared_secret: str = ""

    @classmethod
    def from_env(cls) -> Settings:
        env = _Secrets()
        return cls(
            mongodb_uri=env.mongodb_uri,
            google_client_id=env.google_client_id,
            google_client_secret=env.google_client_secret,
            mcp_shared_secret=env.mcp_shared_secret,
        )

    @property
    def mongodb_db_name(self) -> str:
        return _extract_db_name(self.mongodb_uri)

    @property
    def environment(self) -> str:
        """Normalised ``ENVIRONMENT`` value (uppercase, defaults to
        ``DEVELOPMENT``)."""
        return ENVIRONMENT

    @property
    def is_production(self) -> bool:
        """True iff ``ENVIRONMENT=PRODUCTION``."""
        return IS_PRODUCTION


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()


settings: Settings = get_settings()


__all__ = [
    "AppConfig",
    "GoogleConfig",
    "Collections",
    "ENVIRONMENT",
    "IS_PRODUCTION",
    "Settings",
    "get_settings",
    "settings",
]
