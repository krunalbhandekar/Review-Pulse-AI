"""Async HTTP client for the Review Pulse AI MCP service.

Every request includes the calling user's ``user_id`` so the MCP server
can pull the right tokens out of MongoDB. The server-side report
generation pipeline is the only caller; routes never hit MCP directly.
"""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.config import settings
from app.utils.errors import UpstreamError
from app.utils.logging import get_logger

log = get_logger("integration.mcp")

_RETRYABLE = frozenset({408, 425, 429, 500, 502, 503, 504})


class MCPClient:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        timeout: float | None = None,
        max_retries: int | None = None,
        backoff_seconds: float | None = None,
    ) -> None:
        self._base_url = (base_url or settings.mcp_server_url).rstrip("/")
        if not self._base_url:
            raise ValueError("MCP_SERVER_URL is not configured")
        self._timeout = timeout if timeout is not None else settings.mcp.TIMEOUT_SECONDS
        self._max_retries = (
            max_retries if max_retries is not None else settings.mcp.MAX_RETRIES
        )
        self._backoff = (
            backoff_seconds
            if backoff_seconds is not None
            else settings.mcp.BACKOFF_SECONDS
        )

    async def append_to_doc(
        self,
        *,
        user_id: str,
        doc_id: str,
        content: str,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        return await self._post(
            "/append_to_doc",
            {"user_id": user_id, "doc_id": doc_id, "content": content},
            idempotency_key=idempotency_key,
        )

    async def create_doc(
        self,
        *,
        user_id: str,
        title: str,
        content: str,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        return await self._post(
            "/create_doc",
            {"user_id": user_id, "title": title, "content": content},
            idempotency_key=idempotency_key,
        )

    async def send_email(
        self,
        *,
        user_id: str,
        to: str,
        subject: str,
        body: str,
        draft_only: bool = False,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        return await self._post(
            "/send_email",
            {
                "user_id": user_id,
                "to": to,
                "subject": subject,
                "body": body,
                "draft_only": draft_only,
            },
            idempotency_key=idempotency_key,
        )

    async def _post(
        self,
        path: str,
        payload: dict[str, Any],
        *,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        if settings.mcp_shared_secret:
            headers["X-MCP-Secret"] = settings.mcp_shared_secret

        attempts = self._max_retries + 1
        last_exc: Exception | None = None

        bound = log.bind(mcp_path=path, payload_keys=sorted(payload.keys()))

        async with httpx.AsyncClient(
            base_url=self._base_url,
            timeout=self._timeout,
        ) as client:
            for attempt in range(1, attempts + 1):
                try:
                    response = await client.post(path, json=payload, headers=headers)
                except (httpx.TimeoutException, httpx.TransportError) as exc:
                    last_exc = exc
                    bound.warning("mcp.transport_error", attempt=attempt, error=str(exc))
                    await asyncio.sleep(self._backoff * (2 ** (attempt - 1)))
                    continue

                if response.status_code in _RETRYABLE:
                    bound.warning(
                        "mcp.retryable_status",
                        attempt=attempt,
                        status=response.status_code,
                    )
                    last_exc = UpstreamError(
                        f"MCP {path} returned {response.status_code}",
                        status_code=response.status_code,
                    )
                    await asyncio.sleep(self._backoff * (2 ** (attempt - 1)))
                    continue

                if response.is_error:
                    body = _safe_json(response)
                    bound.error(
                        "mcp.client_error", status=response.status_code, body=body
                    )
                    raise UpstreamError(
                        f"MCP {path} rejected request: {response.status_code} {body}",
                        status_code=response.status_code,
                    )

                try:
                    data = response.json()
                except ValueError as exc:
                    raise UpstreamError("MCP returned non-JSON response") from exc

                bound.info("mcp.ok", status=response.status_code)
                return data

        bound.error("mcp.retries_exhausted", attempts=attempts)
        raise UpstreamError(
            f"MCP {path} failed after {attempts} attempts: {last_exc}",
            status_code=502,
        )


def _safe_json(response: httpx.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return response.text[:500] if response.text else None
