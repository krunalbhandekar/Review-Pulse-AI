"""Report generation pipeline (per user, per product).

Stages
------
1. Ingest reviews from Play/App stores (``services.ingestion``)
2. Summarise via Groq (``services.summarization``)
3. Deliver to Google Docs + Gmail via the multi-tenant MCP
4. Persist a Report row for the dashboard

Failures at each stage are recorded on the Report (status + error) so
the frontend can show a clear history rather than silently dropping runs.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

from app.integrations.mcp_client import MCPClient
from app.models.product import EmailMode, Product
from app.models.report import Report, ReportStatus
from app.repositories.report_repo import ReportRepository
from app.services.ingestion import gather_reviews
from app.services.summarization import summarise_reviews
from app.utils.errors import AppError
from app.utils.logging import get_logger

log = get_logger("service.report")


def _report_title(product_name: str, when: datetime) -> str:
    return f"{product_name} — Weekly Review Pulse — {when:%Y-%m-%d}"


async def generate_report_for_product(
    *,
    user_id: ObjectId,
    product: Product,
    schedule_id: Optional[ObjectId] = None,
) -> Report:
    """Run the full pipeline for one product and persist the result."""
    started_at = datetime.now(timezone.utc)
    bound = log.bind(
        user_id=str(user_id),
        product_id=str(product.id),
        product_name=product.productName,
        schedule_id=str(schedule_id) if schedule_id else None,
    )
    bound.info("report.start")

    report = Report(
        productId=product.id,
        userId=user_id,
        scheduleId=schedule_id,
        reportTitle=_report_title(product.productName, started_at),
        status=ReportStatus.SUCCESS,
        generatedAt=started_at,
    )
    delivery_meta: dict = {}

    # 1. INGEST
    try:
        reviews, ingestion_meta = await gather_reviews(
            playstore_app_id=product.playstoreAppId,
            appstore_app_id=product.appstoreAppId,
            lookback_weeks=product.lookbackWeeks,
        )
        report.reviewCount = len(reviews)
        delivery_meta["ingestion"] = ingestion_meta.as_dict()
        bound.info(
            "report.ingested",
            count=len(reviews),
            playstore_count=ingestion_meta.playstore_reviews,
            appstore_count=ingestion_meta.appstore_reviews,
            appstore_status=ingestion_meta.appstore_status,
            playstore_status=ingestion_meta.playstore_status,
            ingestion_runtime_seconds=ingestion_meta.ingestion_runtime_seconds,
        )
        if ingestion_meta.appstore_status == "failed" and ingestion_meta.playstore_reviews > 0:
            # Soft-partial: we have a usable corpus from Play Store but
            # one source was lost. Surface that in the report status.
            report.status = ReportStatus.PARTIAL
    except Exception as exc:  # noqa: BLE001
        bound.error("report.ingest_failed", error=str(exc))
        report.status = ReportStatus.FAILED
        report.error = f"ingest_failed: {exc}"
        return await ReportRepository().create(report)

    # 2. SUMMARISE — never raises; falls back to a heuristic summary so
    # the report is always populated.
    #   full     => final merge succeeded         -> SUCCESS
    #   partial  => chunk summaries combined      -> PARTIAL
    #   fallback => deterministic local summary   -> PARTIAL
    #   empty summary string                      -> FAILED
    try:
        summary_result = await summarise_reviews(
            product_name=product.productName,
            reviews=reviews,
        )
        report.summary = summary_result.summary
        delivery_meta["summary_quality"] = summary_result.summary_quality
        if summary_result.summary_quality == "full":
            report.status = ReportStatus.SUCCESS
        elif summary_result.summary_quality in ("partial", "fallback"):
            report.status = ReportStatus.PARTIAL
            report.error = f"summary_quality={summary_result.summary_quality}"
        bound.info(
            "report.summarised",
            length=len(report.summary),
            summary_quality=summary_result.summary_quality,
            reviews_selected=summary_result.reviews_selected,
            chunk_count=summary_result.chunk_count,
            chunk_summary_success=summary_result.chunk_success,
            chunk_summary_failed=summary_result.chunk_failed,
            total_estimated_tokens=summary_result.total_estimated_tokens,
            groq_requests_count=summary_result.groq_requests_count,
            groq_retry_count=summary_result.groq_retry_count,
            total_runtime_seconds=summary_result.total_runtime_seconds,
        )
    except Exception as exc:  # noqa: BLE001
        bound.error("report.summarise_failed", error=str(exc))
        report.status = ReportStatus.FAILED
        report.error = f"summarise_failed: {exc}"
        return await ReportRepository().create(report)

    if not report.summary:
        bound.error("report.summary_empty")
        report.status = ReportStatus.FAILED
        report.error = "summary_empty"
        return await ReportRepository().create(report)

    # 3. DELIVER — Google Doc + Email. Failures here are partial: we still
    # have a usable summary, but downstream actions didn't all complete.
    mcp = MCPClient()
    user_id_str = str(user_id)

    if product.googleDocId:
        try:
            doc_result = await mcp.append_to_doc(
                user_id=user_id_str,
                doc_id=product.googleDocId,
                content=report.summary,
                idempotency_key=f"doc-{product.id}-{int(started_at.timestamp())}",
            )
            report.googleDocId = product.googleDocId
            report.googleDocUrl = (
                f"https://docs.google.com/document/d/{product.googleDocId}/edit"
            )
            delivery_meta["doc"] = doc_result
        except AppError as exc:
            bound.warning("report.doc_failed", error=str(exc))
            report.status = ReportStatus.PARTIAL
            delivery_meta["doc_error"] = str(exc)
    else:
        try:
            doc_result = await mcp.create_doc(
                user_id=user_id_str,
                title=report.reportTitle,
                content=report.summary,
                idempotency_key=f"newdoc-{product.id}-{int(started_at.timestamp())}",
            )
            doc_id = doc_result.get("document_id") or doc_result.get("doc_id")
            if doc_id:
                report.googleDocId = doc_id
                report.googleDocUrl = (
                    f"https://docs.google.com/document/d/{doc_id}/edit"
                )
            delivery_meta["doc"] = doc_result
        except AppError as exc:
            bound.warning("report.create_doc_failed", error=str(exc))
            report.status = ReportStatus.PARTIAL
            delivery_meta["doc_error"] = str(exc)

    if product.emailTo:
        # Per-product setting wins. ``draft`` (the safe default for a new
        # product) creates a Gmail draft; ``send`` actually sends. The
        # global ENVIRONMENT flag intentionally no longer gates this —
        # operators control delivery per-product from the dashboard.
        draft_only = product.emailMode != EmailMode.SEND
        try:
            email_body = report.summary
            if report.googleDocUrl:
                email_body = f"{email_body}\n\n---\nFull doc: {report.googleDocUrl}\n"
            email_result = await mcp.send_email(
                user_id=user_id_str,
                to=product.emailTo,
                subject=report.reportTitle,
                body=email_body,
                draft_only=draft_only,
                idempotency_key=f"mail-{product.id}-{int(started_at.timestamp())}",
            )
            # Echo the resolved mode back to the dashboard so reports/<id>
            # can show "Draft" vs "Sent" without re-reading the product.
            email_result["mode"] = (
                EmailMode.DRAFT.value if draft_only else EmailMode.SEND.value
            )
            delivery_meta["email"] = email_result
        except AppError as exc:
            bound.warning("report.email_failed", error=str(exc))
            report.status = ReportStatus.PARTIAL
            delivery_meta["email_error"] = str(exc)

    report.deliveryMeta = delivery_meta

    # 4. PERSIST
    saved = await ReportRepository().create(report)
    bound.info("report.done", status=saved.status, report_id=str(saved.id))
    return saved
