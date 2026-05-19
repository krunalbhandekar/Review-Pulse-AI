"""Settings layer.

Two surfaces:

* **Static configs** (``AppConfig``, ``SessionConfig``, ``MCPConfig``,
  ``GroqConfig``, ``SchedulerConfig``, ``Collections``,
  ``GOOGLE_OAUTH_SCOPES``) — diffable, code-reviewed, no env binding.
* **Secrets / deployment-specific values** (``Secrets``) — only what
  *must* differ between environments. Loaded from ``.env`` /
  process env via ``pydantic-settings``.

The merged ``Settings`` object composes both and is what application
code should depend on (``from app.config import settings``).
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
# ``ENVIRONMENT`` is the only signal that decides production-ness. Anything
# other than the literal string ``PRODUCTION`` (case-insensitive) is treated
# as a non-prod environment. Missing or blank => DEVELOPMENT.
ENVIRONMENT: str = (os.getenv("ENVIRONMENT") or "DEVELOPMENT").strip().upper() or "DEVELOPMENT"
IS_PRODUCTION: bool = ENVIRONMENT == "PRODUCTION"


# ---------------------------------------------------------------------------
# Static configs — no env binding
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class AppConfig:
    """Core app identity and runtime knobs."""

    # ``APP_NAME`` is the user-facing string FastAPI shows on /docs and
    # echoes in the /health response. Keep aligned with the frontend
    # ``BRAND.name`` so Swagger + dashboard read as the same product.
    APP_NAME: str = "Review Pulse AI"
    APP_VERSION: str = "0.1.0"
    # Default local-dev port. PaaS deployments (Render, Fly, Cloud Run)
    # inject ``$PORT`` and the uvicorn command line picks that up — this
    # constant is *not* read at request time, only used by tooling.
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"


@dataclass(frozen=True)
class SessionConfig:
    """Session-cookie settings.

    The cookie *name* and *lifetime* are operational knobs; the *secret*
    used to sign it is a deployment secret and lives on ``Secrets``.
    """

    COOKIE_NAME: str = "mt_session"
    MAX_AGE_SECONDS: int = 60 * 60 * 24 * 14  # 14 days
    # Default for local dev (same-site localhost). Production overrides this
    # to "none" via Settings.session_same_site because the deployed frontend
    # (Vercel) and backend (Render) live on different registrable domains —
    # SameSite=Lax would silently drop the session cookie on cross-origin
    # XHR/fetch calls from the frontend, causing a /dashboard → /login loop
    # after Google OAuth.
    SAME_SITE: str = "lax"


@dataclass(frozen=True)
class MCPConfig:
    """Tuning for the outbound HTTP client to the MCP service."""

    TIMEOUT_SECONDS: float = 30.0
    MAX_RETRIES: int = 3
    BACKOFF_SECONDS: float = 0.5


@dataclass(frozen=True)
class GroqConfig:
    """Static Groq tuning (model, temperature). API key is a secret."""

    MODEL: str = "llama-3.1-8b-instant"
    TEMPERATURE: float = 0.2
    REQUEST_TIMEOUT_SECONDS: float = 60.0


@dataclass(frozen=True)
class SchedulerConfig:
    """Dispatcher tuning."""

    POLL_INTERVAL: int = 30  # seconds between dispatcher ticks


@dataclass(frozen=True)
class PipelineConfig:
    """Report-pipeline shaping knobs."""

    # Per-source pull cap on each ingestion run.
    INGEST_PER_SOURCE_LIMIT: int = 300
    # Per-review body cap to keep prompts within Groq context windows.
    MAX_REVIEW_BODY_CHARS: int = 600
    # Hard cap on the rendered prompt body sent to the summariser.
    SUMMARY_INPUT_CHAR_CAP: int = 18_000

    # Summarisation safety knobs — keep Groq payloads under model limits.
    MAX_REVIEWS_PER_RUN: int = 80
    MAX_REVIEW_CHARS: int = 500
    SUMMARY_CHUNK_SIZE: int = 10
    MAX_ESTIMATED_TOKENS: int = 4500
    # Chunk-summary compaction before the final merge — keeps TPM low.
    MAX_CHUNK_SUMMARY_CHARS: int = 1200
    # Cooldown applied before the final merge if we've already burned
    # through the per-minute token budget.
    TPM_COOLDOWN_SECONDS: float = 10.0
    # Low-cost mode caps (used when LOW_COST_MODE=true).
    LOW_COST_MAX_REVIEWS: int = 40
    LOW_COST_CHUNK_SIZE: int = 5


# Google OAuth scopes — immutable; reviewed in code, not in env.
GOOGLE_OAUTH_SCOPES: tuple[str, ...] = (
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.send",
)

GOOGLE_AUTH_URL: str = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL: str = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL: str = "https://openidconnect.googleapis.com/v1/userinfo"


class Collections:
    """MongoDB collection names — single source of truth."""

    USERS = "users"
    GOOGLE_CONNECTIONS = "google_connections"
    PRODUCTS = "products"
    SCHEDULES = "schedules"
    REPORTS = "reports"
    JOB_RUNS = "job_runs"


# ---------------------------------------------------------------------------
# Secrets / deployment-specific values (env-loaded)
# ---------------------------------------------------------------------------


class _Secrets(BaseSettings):
    """Internal env loader. Surfaced as attributes on :class:`Settings`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # MongoDB — full connection string *including* default DB name.
    # Example: ``mongodb+srv://u:p@cluster.mongodb.net/mt_review_intelligence``
    mongodb_uri: str = ""

    # Signs the session cookie; rotating it logs everyone out.
    session_secret: str = ""

    # Google OAuth client (same client is shared by server + mcp).
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    # Where to send the browser after login / logout. CORS origins are
    # derived from these — no separate FRONTEND_ORIGINS variable.
    post_login_redirect: str = "http://localhost:5173/dashboard"
    post_logout_redirect: str = "http://localhost:5173/"

    # Downstream MCP service.
    mcp_server_url: str = "http://localhost:9000"
    mcp_shared_secret: str = ""

    # Groq summarisation.
    groq_api_key: str = ""
    # When true, the summariser uses aggressive caps and skips the final
    # merge call — intended for free-tier Groq accounts hitting TPM 429s.
    low_cost_mode: bool = False


# ---------------------------------------------------------------------------
# Merged settings
# ---------------------------------------------------------------------------


def _extract_db_name(uri: str) -> str:
    """Pull the default database name out of a Mongo connection URI.

    We *require* the URI to include the DB name (e.g.
    ``...mongodb.net/mt_review_intelligence``). Empty / missing DB is a
    configuration bug we want to fail fast on — silently picking a
    fallback would make it easy to write to the wrong cluster.
    """
    if not uri:
        return ""
    # ``urlparse`` understands ``mongodb://`` and ``mongodb+srv://``
    # the same way; the path is ``/<db>``.
    path = urlparse(uri).path.lstrip("/")
    # Strip any auth-source options that some tools tack onto the path.
    return path.split("?")[0].strip()


@dataclass(frozen=True)
class Settings:
    """Single object passed through the app.

    Static configs are accessed by attribute (``settings.app.PORT``);
    secrets are flat top-level fields (``settings.mongodb_uri``)."""

    app: AppConfig = field(default_factory=AppConfig)
    session: SessionConfig = field(default_factory=SessionConfig)
    mcp: MCPConfig = field(default_factory=MCPConfig)
    groq: GroqConfig = field(default_factory=GroqConfig)
    scheduler: SchedulerConfig = field(default_factory=SchedulerConfig)
    pipeline: PipelineConfig = field(default_factory=PipelineConfig)

    # Secrets / deployment-specific
    mongodb_uri: str = ""
    session_secret: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""
    post_login_redirect: str = ""
    post_logout_redirect: str = ""
    mcp_server_url: str = ""
    mcp_shared_secret: str = ""
    groq_api_key: str = ""
    low_cost_mode: bool = False

    @classmethod
    def from_env(cls) -> Settings:
        env = _Secrets()
        return cls(
            mongodb_uri=env.mongodb_uri,
            session_secret=env.session_secret,
            google_client_id=env.google_client_id,
            google_client_secret=env.google_client_secret,
            google_redirect_uri=env.google_redirect_uri,
            post_login_redirect=env.post_login_redirect,
            post_logout_redirect=env.post_logout_redirect,
            mcp_server_url=env.mcp_server_url,
            mcp_shared_secret=env.mcp_shared_secret,
            groq_api_key=env.groq_api_key,
            low_cost_mode=env.low_cost_mode,
        )

    @property
    def mongodb_db_name(self) -> str:
        """Database name parsed from ``mongodb_uri``."""
        return _extract_db_name(self.mongodb_uri)

    @property
    def cors_origins(self) -> list[str]:
        """Allowed CORS origins, derived from the login/logout redirects.

        The frontend always lives at one of these URLs; there's no need
        for a separate ``FRONTEND_ORIGINS`` env var.
        """
        origins: set[str] = set()
        for url in (self.post_login_redirect, self.post_logout_redirect):
            if not url:
                continue
            parsed = urlparse(url)
            if parsed.scheme and parsed.netloc:
                origins.add(f"{parsed.scheme}://{parsed.netloc}")
        return sorted(origins)

    @property
    def environment(self) -> str:
        """Normalised ``ENVIRONMENT`` value (uppercase, defaults to
        ``DEVELOPMENT``). Used in startup logs."""
        return ENVIRONMENT

    @property
    def is_production(self) -> bool:
        """True iff ``ENVIRONMENT=PRODUCTION``. Used to gate cookie HTTPS
        flags and switch email send-vs-draft behaviour."""
        return IS_PRODUCTION

    @property
    def session_same_site(self) -> str:
        """SameSite attribute for the session cookie.

        Production runs the frontend and backend on different registrable
        domains (Vercel vs Render), so the cookie MUST be ``SameSite=None``
        with ``Secure`` for the browser to attach it to cross-origin
        ``credentials: "include"`` fetches. Locally everything is on
        ``localhost`` and Lax is the safer default.
        """
        return "none" if IS_PRODUCTION else self.session.SAME_SITE

    @property
    def session_https_only(self) -> bool:
        """Mark the cookie ``Secure`` in production. ``SameSite=None``
        without ``Secure`` is rejected by all modern browsers, so these
        two flags must flip together."""
        return IS_PRODUCTION


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()


settings: Settings = get_settings()


__all__ = [
    "AppConfig",
    "SessionConfig",
    "MCPConfig",
    "GroqConfig",
    "SchedulerConfig",
    "PipelineConfig",
    "Collections",
    "GOOGLE_OAUTH_SCOPES",
    "GOOGLE_AUTH_URL",
    "GOOGLE_TOKEN_URL",
    "GOOGLE_USERINFO_URL",
    "ENVIRONMENT",
    "IS_PRODUCTION",
    "Settings",
    "get_settings",
    "settings",
]
