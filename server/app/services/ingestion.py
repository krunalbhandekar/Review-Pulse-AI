"""Pull reviews from Play Store + App Store.

Both ingestion paths run inside a thread executor. The returned
``Review`` is a normalised shape with just the fields the summariser
needs.

App Store reliability
---------------------
The PyPI package ``app-store-scraper==0.3.5`` is effectively dead — it
targets Apple's internal AMP API (``amp-api.apps.apple.com``) which
requires a bearer token scraped from the landing-page HTML. Apple has
since changed that markup, so the regex never matches, the token is
``None``, and the AMP API returns HTTP 401 on every call.

Rather than patch a stale package, we talk directly to Apple's public
customer-reviews RSS endpoint::

    https://itunes.apple.com/{country}/rss/customerreviews/page={n}/id={app_id}/sortby=mostrecent/json

It has no auth, returns JSON, and has been the reliable surface for
external tools for years. We keep the same retry + region-fallback
behaviour around it.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from app.config import settings
from app.utils.logging import get_logger

log = get_logger("service.ingestion")


@dataclass(frozen=True)
class Review:
    source: str           # "playstore" or "appstore"
    rating: int
    title: Optional[str]
    body: str
    author: Optional[str]
    posted_at: datetime


@dataclass
class IngestionMeta:
    """Per-run ingestion outcome for the report's deliveryMeta."""

    playstore_reviews: int = 0
    appstore_reviews: int = 0
    playstore_status: str = "skipped"   # success | failed | skipped | empty
    appstore_status: str = "skipped"    # success | failed | skipped | empty
    appstore_region_used: Optional[str] = None
    appstore_attempts: int = 0
    ingestion_runtime_seconds: float = 0.0
    errors: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "playstore_reviews": self.playstore_reviews,
            "appstore_reviews": self.appstore_reviews,
            "playstore_status": self.playstore_status,
            "appstore_status": self.appstore_status,
            "appstore_region_used": self.appstore_region_used,
            "appstore_attempts": self.appstore_attempts,
            "ingestion_runtime_seconds": self.ingestion_runtime_seconds,
            "errors": self.errors,
        }


def _window_cutoff(lookback_weeks: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(weeks=lookback_weeks)


# ---------------------------------------------------------------------------
# Play Store
# ---------------------------------------------------------------------------


async def fetch_playstore(app_id: str, *, lookback_weeks: int) -> list[Review]:
    """Pull Play Store reviews via google-play-scraper."""
    try:
        from google_play_scraper import Sort, reviews  # type: ignore
    except ImportError:
        log.warning("ingestion.playstore.scraper_missing")
        return []

    def _fetch() -> list[Review]:
        result, _ = reviews(
            app_id,
            lang="en",
            country="us",
            sort=Sort.NEWEST,
            count=settings.pipeline.INGEST_PER_SOURCE_LIMIT,
        )
        cutoff = _window_cutoff(lookback_weeks)
        out: list[Review] = []
        for r in result:
            ts = r.get("at")
            if ts is None:
                continue
            ts = ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts
            if ts < cutoff:
                continue
            out.append(Review(
                source="playstore",
                rating=int(r.get("score", 0) or 0),
                title=None,
                body=(r.get("content") or "").strip(),
                author=r.get("userName"),
                posted_at=ts,
            ))
        return out

    return await asyncio.to_thread(_fetch)


# ---------------------------------------------------------------------------
# App Store
# ---------------------------------------------------------------------------


APPSTORE_REGIONS: tuple[str, ...] = ("us", "in", "gb")
APPSTORE_MAX_RETRIES: int = 2
APPSTORE_BACKOFF_SECONDS: tuple[float, ...] = (2.0, 5.0)
APPSTORE_PAGE_SIZE_HINT: int = 50  # The RSS endpoint returns ~50 entries/page.
APPSTORE_MAX_PAGES: int = 10        # Apple caps the RSS feed at 10 pages.
APPSTORE_TIMEOUT_SECONDS: float = 15.0

# Modern desktop Safari UA — Apple's older RSS endpoint is happy with this,
# and the previous library shipped IE6/Trident strings that now 401.
_APPSTORE_HEADERS: dict[str, str] = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) "
        "Version/17.0 Safari/605.1.15"
    ),
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://apps.apple.com/",
    "Connection": "keep-alive",
}


def _appstore_rss_url(*, country: str, app_id: str, page: int) -> str:
    return (
        f"https://itunes.apple.com/{country}/rss/customerreviews/"
        f"page={page}/id={app_id}/sortby=mostrecent/json"
    )


def _classify_rss_response(response: httpx.Response | None, exc: BaseException | None) -> tuple[str, str]:
    """Classify a single RSS HTTP response.

    Returns ``(status, snippet)`` where status is one of:
    ``success``, ``empty``, ``html``, ``invalid_json``, ``rate_limited``,
    ``network``, ``http_4xx``, ``server_error``.
    """
    if exc is not None and response is None:
        name = type(exc).__name__.lower()
        if "timeout" in name or "connect" in name:
            return "network", str(exc)
        return "network", str(exc)

    assert response is not None
    status_code = response.status_code
    try:
        body = response.text or ""
    except Exception:  # noqa: BLE001
        body = ""
    snippet = body[:500]

    if status_code == 429:
        return "rate_limited", snippet
    if status_code >= 500:
        return "server_error", snippet
    if status_code >= 400:
        return f"http_{status_code}", snippet
    if not body.strip():
        return "empty", snippet
    head = body.lstrip()[:64].lower()
    if head.startswith("<!doctype") or head.startswith("<html") or head.startswith("<"):
        return "html", snippet
    return "success", ""


def _parse_rss_entry_date(label: str) -> Optional[datetime]:
    """RSS returns e.g. ``2026-05-16T10:17:41-07:00``."""
    if not label:
        return None
    try:
        # ``fromisoformat`` handles the offset suffix from Python 3.11+.
        ts = datetime.fromisoformat(label)
    except ValueError:
        return None
    return ts.astimezone(timezone.utc) if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


def _parse_rss_entries(entries: list[dict]) -> list[dict]:
    """Convert Apple's RSS JSON entries to flat dicts.

    The *first* entry in the feed is metadata about the app itself
    (no ``im:rating`` key); we skip those.
    """
    out: list[dict] = []
    for e in entries:
        rating_node = e.get("im:rating")
        if not isinstance(rating_node, dict):
            continue
        try:
            rating = int(rating_node.get("label") or 0)
        except (TypeError, ValueError):
            rating = 0
        title = (e.get("title") or {}).get("label") or None
        body = ((e.get("content") or {}).get("label") or "").strip()
        author = (((e.get("author") or {}).get("name") or {}).get("label")) or None
        ts = _parse_rss_entry_date((e.get("updated") or {}).get("label") or "")
        if ts is None:
            continue
        out.append({
            "rating": rating,
            "title": title,
            "review": body,
            "userName": author,
            "date": ts,
        })
    return out


def _fetch_appstore_region(
    client: httpx.Client,
    *,
    app_id: str,
    country: str,
    max_pages: int,
    cutoff: datetime,
) -> tuple[list[dict], str, str, int]:
    """Single-region App Store fetch via RSS, with retry/backoff per page.

    Returns ``(raw_reviews, status, snippet, attempts)``.
    """
    raw: list[dict] = []
    attempts = 0
    last_status = "unknown"
    last_snippet = ""

    for page in range(1, max_pages + 1):
        url = _appstore_rss_url(country=country, app_id=app_id, page=page)
        page_succeeded = False
        page_status = "unknown"
        page_snippet = ""

        for attempt in range(APPSTORE_MAX_RETRIES + 1):
            attempts += 1
            response: httpx.Response | None = None
            exc: BaseException | None = None
            try:
                response = client.get(url, headers=_APPSTORE_HEADERS)
            except httpx.HTTPError as e:
                exc = e

            page_status, page_snippet = _classify_rss_response(response, exc)
            last_status, last_snippet = page_status, page_snippet

            log.debug(
                "ingestion.appstore.request",
                app_id=app_id,
                country=country,
                page=page,
                attempt=attempt,
                http_status=getattr(response, "status_code", None),
                final_url=str(response.url) if response is not None else None,
                content_type=(response.headers.get("content-type") if response is not None else None),
                body_len=(len(response.text) if response is not None else 0),
            )

            if page_status == "success":
                try:
                    data = response.json()  # type: ignore[union-attr]
                except Exception as parse_exc:  # noqa: BLE001
                    page_status = "invalid_json"
                    last_status = page_status
                    log.warning(
                        "ingestion.appstore.parse_failed",
                        app_id=app_id,
                        country=country,
                        page=page,
                        error=str(parse_exc),
                        response_preview=page_snippet,
                    )
                    break  # don't retry parse errors on the same body
                entries = (data.get("feed") or {}).get("entry") or []
                # ``entry`` can be a single dict if there's exactly one
                # review on the page; normalise to a list.
                if isinstance(entries, dict):
                    entries = [entries]
                parsed = _parse_rss_entries(entries)
                raw.extend(parsed)
                page_succeeded = True
                break

            if page_status == "empty":
                page_succeeded = True
                break

            log.warning(
                "ingestion.appstore.attempt_failed",
                app_id=app_id,
                country=country,
                page=page,
                attempt=attempt,
                status=page_status,
                http_status=getattr(response, "status_code", None),
                final_url=str(response.url) if response is not None else None,
                content_type=(response.headers.get("content-type") if response is not None else None),
                response_preview=page_snippet,
            )

            if attempt < APPSTORE_MAX_RETRIES:
                delay = APPSTORE_BACKOFF_SECONDS[
                    min(attempt, len(APPSTORE_BACKOFF_SECONDS) - 1)
                ]
                time.sleep(delay)

        if not page_succeeded:
            # If page 1 fails outright we abandon the region; if a later
            # page fails we still keep what we've got from earlier pages.
            if page == 1:
                return raw, page_status, page_snippet, attempts
            log.info(
                "ingestion.appstore.page_stopped",
                app_id=app_id,
                country=country,
                stopped_at_page=page,
                status=page_status,
                collected=len(raw),
            )
            break

        # Early-exit: every entry on this page is already older than
        # the lookback window. There's no point asking for older pages.
        if raw and all(
            (r["date"] < cutoff) for r in raw[-APPSTORE_PAGE_SIZE_HINT:]
        ):
            log.debug(
                "ingestion.appstore.cutoff_reached",
                app_id=app_id,
                country=country,
                page=page,
                collected=len(raw),
            )
            break

    if raw:
        final_status = "success"
    elif last_status in ("success", "empty", "unknown"):
        # All pages parsed cleanly but yielded zero review entries —
        # this region has no reviews, not a failure.
        final_status = "empty"
    else:
        final_status = last_status
    return raw, final_status, last_snippet, attempts


async def fetch_appstore(
    app_id: str,
    *,
    lookback_weeks: int,
    meta: IngestionMeta,
) -> list[Review]:
    """Pull App Store reviews via Apple's customer-reviews RSS endpoint.

    Updates ``meta`` in-place so the caller can attach the outcome to
    ``Report.deliveryMeta``. Always returns a list — never raises.
    """
    cutoff = _window_cutoff(lookback_weeks)
    # The RSS endpoint serves ~50 reviews per page, capped at 10 pages.
    # Use the project-wide ingest limit to derive how many pages we need.
    requested_pages = max(
        1,
        min(
            APPSTORE_MAX_PAGES,
            (settings.pipeline.INGEST_PER_SOURCE_LIMIT + APPSTORE_PAGE_SIZE_HINT - 1)
            // APPSTORE_PAGE_SIZE_HINT,
        ),
    )

    def _fetch() -> list[Review]:
        out: list[Review] = []
        final_status = "failed"
        region_used: Optional[str] = None
        total_attempts = 0
        last_snippet = ""

        with httpx.Client(
            timeout=APPSTORE_TIMEOUT_SECONDS,
            follow_redirects=True,
        ) as client:
            for country in APPSTORE_REGIONS:
                raw, status, snippet, attempts = _fetch_appstore_region(
                    client,
                    app_id=app_id,
                    country=country,
                    max_pages=requested_pages,
                    cutoff=cutoff,
                )
                total_attempts += attempts
                last_snippet = snippet or last_snippet

                if raw:
                    region_used = country
                    final_status = "success"
                    log.info(
                        "ingestion.appstore.region_success",
                        app_id=app_id,
                        country=country,
                        attempts=attempts,
                        raw_count=len(raw),
                    )
                    for r in raw:
                        try:
                            ts: datetime = r["date"]
                            if ts < cutoff:
                                continue
                            out.append(Review(
                                source="appstore",
                                rating=int(r.get("rating", 0) or 0),
                                title=r.get("title"),
                                body=(r.get("review") or "").strip(),
                                author=r.get("userName"),
                                posted_at=ts,
                            ))
                        except Exception as exc:  # noqa: BLE001
                            log.warning(
                                "ingestion.appstore.row_skipped",
                                app_id=app_id,
                                error=str(exc),
                            )
                    break

                if status == "empty":
                    final_status = "empty"
                    log.info(
                        "ingestion.appstore.region_empty",
                        app_id=app_id,
                        country=country,
                    )
                    continue

                log.warning(
                    "ingestion.appstore.region_failed",
                    app_id=app_id,
                    country=country,
                    status=status,
                    attempts=attempts,
                    response_preview=snippet,
                )
                meta.errors.append(f"appstore:{country}:{status}")

        meta.appstore_reviews = len(out)
        meta.appstore_attempts = total_attempts
        meta.appstore_region_used = region_used
        meta.appstore_status = (
            final_status if out or final_status == "empty" else "failed"
        )
        return out

    return await asyncio.to_thread(_fetch)


# ---------------------------------------------------------------------------
# Combined entry point
# ---------------------------------------------------------------------------


async def gather_reviews(
    *,
    playstore_app_id: Optional[str],
    appstore_app_id: Optional[str],
    lookback_weeks: int,
) -> tuple[list[Review], IngestionMeta]:
    """Run both ingestion paths in parallel.

    Returns ``(reviews_sorted_newest_first, meta)``. An app-store failure
    never affects the play-store result and vice versa.
    """
    started = time.monotonic()
    meta = IngestionMeta()
    reviews: list[Review] = []

    async def _play() -> None:
        if not playstore_app_id:
            return
        try:
            ps_reviews = await fetch_playstore(
                playstore_app_id, lookback_weeks=lookback_weeks
            )
            reviews.extend(ps_reviews)
            meta.playstore_reviews = len(ps_reviews)
            meta.playstore_status = "success" if ps_reviews else "empty"
        except Exception as exc:  # noqa: BLE001
            meta.playstore_status = "failed"
            meta.errors.append(f"playstore:{exc}")
            log.warning("ingestion.playstore.failed", error=str(exc))

    async def _app() -> None:
        if not appstore_app_id:
            return
        try:
            as_reviews = await fetch_appstore(
                appstore_app_id, lookback_weeks=lookback_weeks, meta=meta
            )
            reviews.extend(as_reviews)
        except Exception as exc:  # noqa: BLE001
            # fetch_appstore already swallows its own errors, but guard
            # against an unexpected escape (e.g. import-time issue).
            meta.appstore_status = "failed"
            meta.errors.append(f"appstore:{exc}")
            log.warning("ingestion.appstore.failed", error=str(exc))

    await asyncio.gather(_play(), _app())

    reviews.sort(key=lambda x: x.posted_at, reverse=True)
    meta.ingestion_runtime_seconds = round(time.monotonic() - started, 3)

    log.info(
        "ingestion.done",
        playstore_count=meta.playstore_reviews,
        appstore_count=meta.appstore_reviews,
        playstore_status=meta.playstore_status,
        appstore_status=meta.appstore_status,
        appstore_region_used=meta.appstore_region_used,
        appstore_attempts=meta.appstore_attempts,
        ingestion_runtime_seconds=meta.ingestion_runtime_seconds,
    )
    return reviews, meta
