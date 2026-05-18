"""Summarise a batch of reviews into a leadership-friendly digest.

Pipeline:

    reviews -> selection/truncation -> chunk summaries -> final summary
                                                    \\-> heuristic fallback

The Groq llama-3.1-8b-instant model has a tight per-request token budget
(HTTP 413 on overflow), so we cap reviews per run, truncate bodies, and
fan out into small chunks before merging. If Groq is unavailable or any
LLM step fails, we still return a deterministic local summary so the
scheduler can deliver *something* to the user.
"""

from __future__ import annotations

import asyncio
import re
import time
from collections import Counter
from dataclasses import dataclass
from typing import Iterable

from app.config import settings
from app.integrations.groq_client import GroqClient
from app.services.ingestion import Review
from app.utils.errors import AppError
from app.utils.logging import get_logger

log = get_logger("service.summarization")


# Tight prompts — chunk summaries feed the final merge, so every extra
# token here multiplies into the merge's TPM cost.
CHUNK_SYSTEM_PROMPT = """You are a product analyst. Summarise this batch of app reviews.

Output ONLY the sections below, in markdown, max 250 words total.
Use terse bullets. No intros, no closers, no restating the task.

- **Top positives:** 2-3 bullets
- **Top negatives:** 2-3 bullets
- **Recurring complaints:** 2-3 bullets
- **Feature requests:** 0-3 bullets (omit section if none)
- **Sentiment:** one short line (e.g. "mostly negative, churn risk on login")

Do not invent quotes or details.
"""


FINAL_SYSTEM_PROMPT = """You are a product analyst. Merge the chunk summaries below into a leadership report.

Output ONLY these sections, in markdown, in this exact order. No prose
outside the sections. Deduplicate aggressively. Max 350 words total.

## Executive Summary
2-3 sentences.

## Key Pain Points
3-5 bullets, most impactful first.

## Positive Feedback
2-4 bullets.

## Feature Requests
0-4 bullets (omit if none).

## Action Items
3-5 imperative bullets.

## Sentiment Snapshot
One line: overall tone + any notable shift.
"""


_WHITESPACE = re.compile(r"\s+")
# Keep letters/numbers/basic punctuation; drop control bytes and stray symbols.
_GARBAGE = re.compile(r"[^\w\s\.,!\?\-\'\"\(\):;/&%@#\$]+", re.UNICODE)
_MIN_BODY_CHARS = 10


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------


def estimate_tokens(text: str) -> int:
    """Cheap token estimate (~4 chars/token).

    Good enough to decide whether to shrink chunk size before a Groq call;
    we deliberately avoid pulling in tiktoken for one heuristic.
    """
    if not text:
        return 0
    return max(1, len(text) // 4)


def _clean_body(body: str, *, max_chars: int) -> str:
    if not body:
        return ""
    cleaned = _GARBAGE.sub(" ", body)
    cleaned = _WHITESPACE.sub(" ", cleaned).strip()
    if len(cleaned) > max_chars:
        cleaned = cleaned[: max_chars - 1].rstrip() + "…"
    return cleaned


def _priority(r: Review) -> tuple:
    """Sort key — lower is higher priority.

    Priorities (in order):
      1. Low-rating reviews (1-3 stars) first
      2. Longer bodies first
      3. Newer first
    """
    low_rating = 0 if 1 <= r.rating <= 3 else 1
    body_len = -len(r.body or "")
    recency = -r.posted_at.timestamp() if r.posted_at else 0.0
    return (low_rating, body_len, recency)


@dataclass(frozen=True)
class _PreparedReview:
    source: str
    rating: int
    posted_at_iso: str
    body: str

    def render(self) -> str:
        return f"- [{self.source} | {self.rating}/5 | {self.posted_at_iso}] {self.body}"


def _select_and_prepare(
    reviews: list[Review],
    *,
    max_reviews: int | None = None,
) -> list[_PreparedReview]:
    p = settings.pipeline
    cap = max_reviews if max_reviews is not None else p.MAX_REVIEWS_PER_RUN
    sorted_reviews = sorted(reviews, key=_priority)
    out: list[_PreparedReview] = []
    for r in sorted_reviews:
        body = _clean_body(r.body or "", max_chars=p.MAX_REVIEW_CHARS)
        if len(body) < _MIN_BODY_CHARS:
            continue
        out.append(
            _PreparedReview(
                source=r.source,
                rating=int(r.rating or 0),
                posted_at_iso=r.posted_at.strftime("%Y-%m-%d") if r.posted_at else "",
                body=body,
            )
        )
        if len(out) >= cap:
            break
    return out


def _chunk(items: list[_PreparedReview], size: int) -> Iterable[list[_PreparedReview]]:
    size = max(1, size)
    for i in range(0, len(items), size):
        yield items[i : i + size]


def _render_chunk(chunk: list[_PreparedReview]) -> str:
    return "\n".join(r.render() for r in chunk)


def _shrink_chunk_size(chunk: list[_PreparedReview], current_size: int) -> int:
    """Pick a smaller chunk size if the rendered chunk overshoots the budget."""
    rendered = _render_chunk(chunk)
    tokens = estimate_tokens(rendered)
    max_tokens = settings.pipeline.MAX_ESTIMATED_TOKENS
    if tokens <= max_tokens:
        return current_size
    # Scale proportionally; floor at 3 so we don't degrade into per-review calls.
    ratio = max_tokens / float(tokens)
    new_size = max(3, int(current_size * ratio))
    return new_size if new_size < current_size else max(3, current_size - 1)


# ---------------------------------------------------------------------------
# Fallback summary (deterministic, no LLM)
# ---------------------------------------------------------------------------


_STOPWORDS = {
    "the", "and", "for", "with", "this", "that", "have", "has", "had",
    "are", "was", "were", "but", "not", "you", "your", "from", "they",
    "their", "them", "our", "its", "it's", "i've", "i'm", "i'd", "we've",
    "we're", "app", "apps", "just", "very", "really", "would", "could",
    "should", "much", "more", "less", "any", "all", "out", "get", "got",
    "use", "used", "using", "one", "two", "now", "can", "still", "even",
    "what", "when", "where", "which", "who", "why", "how", "into", "than",
    "then", "there", "here", "also", "been", "being", "make", "made",
    "like", "want", "need", "good", "bad", "great", "well", "ever",
    "every", "some", "only", "about", "after", "before", "over", "under",
}


def _top_keywords(items: list[_PreparedReview], *, top_n: int = 10) -> list[str]:
    counter: Counter[str] = Counter()
    for r in items:
        for tok in re.findall(r"[A-Za-z']{4,}", r.body.lower()):
            if tok in _STOPWORDS:
                continue
            counter[tok] += 1
    return [w for w, _ in counter.most_common(top_n)]


def _fallback_summary(product_name: str, items: list[_PreparedReview]) -> str:
    if not items:
        return (
            f"# {product_name} — Weekly Review Pulse\n\n"
            "No usable reviews were available for this period."
        )
    total = len(items)
    ratings = [r.rating for r in items if r.rating > 0]
    avg = (sum(ratings) / len(ratings)) if ratings else 0.0
    positive = sum(1 for r in items if r.rating >= 4)
    negative = sum(1 for r in items if 1 <= r.rating <= 2)
    neutral = total - positive - negative
    keywords = _top_keywords(items)
    keyword_line = ", ".join(keywords) if keywords else "—"

    return (
        f"# {product_name} — Weekly Review Pulse (Fallback Summary)\n\n"
        "_AI summarisation was unavailable; the figures below are computed "
        "directly from the sampled reviews._\n\n"
        "## Snapshot\n"
        f"- Reviews analysed: **{total}**\n"
        f"- Average rating: **{avg:.2f} / 5**\n"
        f"- Positive (4-5★): **{positive}**\n"
        f"- Neutral (3★): **{neutral}**\n"
        f"- Negative (1-2★): **{negative}**\n\n"
        "## Top keywords\n"
        f"{keyword_line}\n"
    )


# ---------------------------------------------------------------------------
# Public result + entry point
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SummaryResult:
    summary: str
    used_fallback: bool
    reviews_selected: int
    chunk_count: int
    chunk_success: int
    chunk_failed: int
    # "full"     => final merge succeeded
    # "partial"  => chunk summaries combined directly (no final merge)
    # "fallback" => deterministic local summary (Groq unusable)
    summary_quality: str = "full"
    total_estimated_tokens: int = 0
    groq_requests_count: int = 0
    groq_retry_count: int = 0
    total_runtime_seconds: float = 0.0


def _compress_chunk_summary(text: str, *, max_chars: int) -> str:
    """Shrink a chunk summary before the final merge.

    - Collapse whitespace and blank lines.
    - Drop duplicate lines (case-insensitive, stripped).
    - Truncate to ``max_chars``, preferring a clean line boundary.
    """
    if not text:
        return ""
    seen: set[str] = set()
    cleaned_lines: list[str] = []
    for raw in text.splitlines():
        line = _WHITESPACE.sub(" ", raw).strip()
        if not line:
            continue
        key = line.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned_lines.append(line)
    cleaned = "\n".join(cleaned_lines)
    if len(cleaned) <= max_chars:
        return cleaned
    # Trim to the last newline within the budget so we don't slice
    # mid-bullet; fall back to a hard cut if no newline is nearby.
    head = cleaned[:max_chars]
    nl = head.rfind("\n")
    if nl > max_chars - 200:
        head = head[:nl]
    return head.rstrip() + "\n…"


async def _summarise_chunk(
    client: GroqClient,
    *,
    product_name: str,
    chunk: list[_PreparedReview],
) -> str:
    user = (
        f"Product: {product_name}\n"
        f"Reviews in this chunk: {len(chunk)}\n\n"
        f"Reviews:\n{_render_chunk(chunk)}"
    )
    return await client.summarise(system=CHUNK_SYSTEM_PROMPT, user=user)


async def _final_from_chunks(
    client: GroqClient,
    *,
    product_name: str,
    chunk_summaries: list[str],
) -> str:
    joined = "\n\n---\n\n".join(
        f"### Chunk {i + 1}\n{s}" for i, s in enumerate(chunk_summaries)
    )
    user = (
        f"Product: {product_name}\n"
        f"Chunk summaries: {len(chunk_summaries)}\n\n{joined}"
    )
    return await client.summarise(system=FINAL_SYSTEM_PROMPT, user=user)


def _combine_chunk_summaries(product_name: str, chunks: list[str]) -> str:
    """Stitch chunk summaries into a single document without an LLM call."""
    body = "\n\n---\n\n".join(
        f"## Section {i + 1}\n{s}" for i, s in enumerate(chunks)
    )
    return (
        f"# {product_name} — Weekly Review Pulse (Combined)\n\n"
        "_Combined from per-chunk summaries; final merge skipped._\n\n"
        + body
    )


async def summarise_reviews(
    *,
    product_name: str,
    reviews: list[Review],
    client: GroqClient | None = None,
) -> SummaryResult:
    """Summarise reviews, always returning a usable digest.

    Returns a :class:`SummaryResult` so the caller can choose a status
    (SUCCESS / PARTIAL) based on which path produced the summary.
    """
    started_at = time.monotonic()
    p = settings.pipeline
    low_cost = bool(settings.low_cost_mode)

    bound = log.bind(
        product_name=product_name,
        reviews_in=len(reviews),
        low_cost_mode=low_cost,
    )

    client = client or GroqClient()

    def _finish(
        *,
        summary: str,
        quality: str,
        reviews_selected: int,
        chunk_count: int,
        chunk_success: int,
        chunk_failed: int,
        tpm_used: int,
    ) -> SummaryResult:
        runtime = time.monotonic() - started_at
        result = SummaryResult(
            summary=summary,
            used_fallback=quality == "fallback",
            reviews_selected=reviews_selected,
            chunk_count=chunk_count,
            chunk_success=chunk_success,
            chunk_failed=chunk_failed,
            summary_quality=quality,
            total_estimated_tokens=tpm_used,
            groq_requests_count=client.request_count,
            groq_retry_count=client.retry_count,
            total_runtime_seconds=round(runtime, 3),
        )
        bound.info(
            "summarisation.metrics",
            summary_quality=quality,
            reviews_selected=reviews_selected,
            chunk_count=chunk_count,
            chunk_summary_success=chunk_success,
            chunk_summary_failed=chunk_failed,
            total_estimated_tokens=tpm_used,
            groq_requests_count=client.request_count,
            groq_retry_count=client.retry_count,
            total_runtime_seconds=result.total_runtime_seconds,
        )
        return result

    if not reviews:
        bound.info("summarisation.empty")
        return _finish(
            summary=(
                f"# {product_name} — Weekly Review Pulse\n\n"
                "No new reviews in the lookback window."
            ),
            quality="full",
            reviews_selected=0,
            chunk_count=0,
            chunk_success=0,
            chunk_failed=0,
            tpm_used=0,
        )

    # Apply low-cost caps before selection so the priority sort runs over
    # the same pool but the slice is smaller.
    max_reviews = p.LOW_COST_MAX_REVIEWS if low_cost else p.MAX_REVIEWS_PER_RUN
    prepared = _select_and_prepare(reviews, max_reviews=max_reviews)
    bound = bound.bind(reviews_selected=len(prepared))
    bound.info("summarisation.selected")

    if not prepared:
        bound.warning("summarisation.fallback_used", reason="no_usable_reviews")
        return _finish(
            summary=_fallback_summary(product_name, prepared),
            quality="fallback",
            reviews_selected=0,
            chunk_count=0,
            chunk_success=0,
            chunk_failed=0,
            tpm_used=0,
        )

    chunk_size = p.LOW_COST_CHUNK_SIZE if low_cost else p.SUMMARY_CHUNK_SIZE
    chunks = list(_chunk(prepared, chunk_size))

    if chunks:
        adjusted = _shrink_chunk_size(chunks[0], chunk_size)
        if adjusted != chunk_size:
            bound.info(
                "summarisation.chunk_size_reduced",
                from_size=chunk_size,
                to_size=adjusted,
            )
            chunk_size = adjusted
            chunks = list(_chunk(prepared, chunk_size))

    bound = bound.bind(chunk_count=len(chunks), chunk_size=chunk_size)

    chunk_summaries: list[str] = []
    failed = 0
    cumulative_tokens = 0

    for idx, chunk in enumerate(chunks):
        rendered = _render_chunk(chunk)
        rendered_tokens = estimate_tokens(rendered)
        cumulative_tokens += rendered_tokens
        try:
            raw = await _summarise_chunk(
                client, product_name=product_name, chunk=chunk
            )
            compact = _compress_chunk_summary(
                raw, max_chars=p.MAX_CHUNK_SUMMARY_CHARS
            )
            cumulative_tokens += estimate_tokens(compact)
            chunk_summaries.append(compact)
            bound.info(
                "summarisation.chunk_summary_success",
                chunk_index=idx,
                estimated_tokens=rendered_tokens,
                cumulative_estimated_tokens=cumulative_tokens,
            )
        except (AppError, Exception) as exc:  # noqa: BLE001
            failed += 1
            bound.warning(
                "summarisation.chunk_summary_failed",
                chunk_index=idx,
                estimated_tokens=rendered_tokens,
                error=str(exc),
            )

    if not chunk_summaries:
        bound.warning("summarisation.fallback_used", reason="all_chunks_failed")
        return _finish(
            summary=_fallback_summary(product_name, prepared),
            quality="fallback",
            reviews_selected=len(prepared),
            chunk_count=len(chunks),
            chunk_success=0,
            chunk_failed=failed,
            tpm_used=cumulative_tokens,
        )

    # Low-cost mode: skip the final merge entirely.
    if low_cost:
        bound.info("summarisation.final_skipped", reason="low_cost_mode")
        return _finish(
            summary=_combine_chunk_summaries(product_name, chunk_summaries),
            quality="partial",
            reviews_selected=len(prepared),
            chunk_count=len(chunks),
            chunk_success=len(chunk_summaries),
            chunk_failed=failed,
            tpm_used=cumulative_tokens,
        )

    # Rate-limit aware cooldown: if we've already burned the per-minute
    # budget on chunks, pause before hitting Groq for the merge.
    if cumulative_tokens > p.MAX_ESTIMATED_TOKENS:
        cooldown = p.TPM_COOLDOWN_SECONDS
        bound.info(
            "summarisation.tpm_cooldown",
            cumulative_estimated_tokens=cumulative_tokens,
            sleep_seconds=cooldown,
        )
        await asyncio.sleep(cooldown)

    final_input_tokens = estimate_tokens("\n".join(chunk_summaries))
    cumulative_tokens += final_input_tokens
    bound.info("summarisation.final_attempt", estimated_tokens=final_input_tokens)

    try:
        final = await _final_from_chunks(
            client, product_name=product_name, chunk_summaries=chunk_summaries
        )
        cumulative_tokens += estimate_tokens(final)
        return _finish(
            summary=final,
            quality="full",
            reviews_selected=len(prepared),
            chunk_count=len(chunks),
            chunk_success=len(chunk_summaries),
            chunk_failed=failed,
            tpm_used=cumulative_tokens,
        )
    except (AppError, Exception) as exc:  # noqa: BLE001
        bound.warning(
            "summarisation.final_failed_using_partial",
            error=str(exc),
        )
        return _finish(
            summary=_combine_chunk_summaries(product_name, chunk_summaries),
            quality="partial",
            reviews_selected=len(prepared),
            chunk_count=len(chunks),
            chunk_success=len(chunk_summaries),
            chunk_failed=failed,
            tpm_used=cumulative_tokens,
        )
