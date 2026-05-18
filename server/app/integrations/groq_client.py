"""Minimal Groq chat-completions client.

The model name, temperature, and request timeout live as static config
on ``GroqConfig``. Only the API key comes from env.

Reliability:

* Retries 429/500/502/503 with exponential backoff (5s, 10s, 20s).
* If Groq returns ``Please try again in Xs`` (TPM rate limiting), the
  parsed delay is used instead of the static backoff.
* Per-instance counters expose request/retry totals for the summariser's
  metrics logging.
"""

from __future__ import annotations

import asyncio
import re

import httpx

from app.config import settings
from app.utils.errors import UpstreamError
from app.utils.logging import get_logger

log = get_logger("integration.groq")

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"

_RETRYABLE_STATUS = {429, 500, 502, 503}
_BACKOFF_SCHEDULE = (5.0, 10.0, 20.0)
# Matches Groq's TPM throttle message; covers float seconds too.
_TRY_AGAIN_RE = re.compile(r"try again in\s+([0-9]+(?:\.[0-9]+)?)\s*s", re.IGNORECASE)


def _parse_retry_after(body: str) -> float | None:
    if not body:
        return None
    match = _TRY_AGAIN_RE.search(body)
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


class GroqClient:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        timeout: float | None = None,
        max_retries: int = 3,
    ) -> None:
        self._api_key = api_key or settings.groq_api_key
        self._model = model or settings.groq.MODEL
        self._temperature = (
            temperature if temperature is not None else settings.groq.TEMPERATURE
        )
        self._timeout = (
            timeout if timeout is not None else settings.groq.REQUEST_TIMEOUT_SECONDS
        )
        self._max_retries = max_retries
        # Metrics — read by the summariser's metrics log line.
        self.request_count: int = 0
        self.retry_count: int = 0

    async def summarise(self, *, system: str, user: str) -> str:
        return await self._chat_with_retry(system=system, user=user)

    async def _chat_with_retry(self, *, system: str, user: str) -> str:
        if not self._api_key:
            raise UpstreamError("GROQ_API_KEY is not configured", status_code=503)

        payload = {
            "model": self._model,
            "temperature": self._temperature,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        last_status: int | None = None
        last_body: str = ""
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            for attempt in range(self._max_retries + 1):
                self.request_count += 1
                try:
                    response = await client.post(
                        GROQ_CHAT_URL, json=payload, headers=headers
                    )
                except httpx.HTTPError as exc:
                    last_status, last_body = None, str(exc)
                    log.warning(
                        "groq.transport_error",
                        attempt=attempt,
                        error=last_body,
                    )
                    if attempt >= self._max_retries:
                        raise UpstreamError(
                            f"Groq transport error: {exc}"
                        ) from exc
                    self.retry_count += 1
                    await asyncio.sleep(_BACKOFF_SCHEDULE[min(attempt, len(_BACKOFF_SCHEDULE) - 1)])
                    continue

                if not response.is_error:
                    data = response.json()
                    try:
                        return data["choices"][0]["message"]["content"].strip()
                    except (KeyError, IndexError) as exc:
                        raise UpstreamError(
                            "Groq response missing choices/message"
                        ) from exc

                last_status = response.status_code
                last_body = response.text or ""
                if (
                    last_status in _RETRYABLE_STATUS
                    and attempt < self._max_retries
                ):
                    delay = _parse_retry_after(last_body)
                    if delay is None:
                        delay = _BACKOFF_SCHEDULE[
                            min(attempt, len(_BACKOFF_SCHEDULE) - 1)
                        ]
                    log.warning(
                        "groq.retrying",
                        status=last_status,
                        attempt=attempt,
                        sleep_seconds=delay,
                        hint=last_body[:200],
                    )
                    self.retry_count += 1
                    await asyncio.sleep(delay)
                    continue

                log.error(
                    "groq.error",
                    status=last_status,
                    body=last_body[:500],
                )
                raise UpstreamError(
                    f"Groq returned {last_status}",
                    status_code=last_status,
                )

        # Exhausted retries on a retryable status.
        log.error(
            "groq.retries_exhausted",
            status=last_status,
            body=last_body[:500],
        )
        raise UpstreamError(
            f"Groq returned {last_status} after retries",
            status_code=last_status or 502,
        )
