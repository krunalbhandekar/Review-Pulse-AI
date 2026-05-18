from __future__ import annotations

import asyncio
from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Path, Query, status

from app.api.deps import CurrentUser, product_repo, report_repo
from app.models.pagination import (
    DEFAULT_PAGE_SIZE,
    LimitQuery,
    Page,
    PageQuery,
    SortOrder,
    resolve_sort,
    skip_for,
)
from app.models.report import ReportPublic, ReportStatus
from app.repositories.product_repo import ProductRepository
from app.repositories.report_repo import ReportRepository
from app.services.report_service import generate_report_for_product
from app.utils.ids import to_object_id

router = APIRouter(prefix="/reports", tags=["reports"])


_REPORT_SORT_FIELDS = {
    "generatedAt": "generatedAt",
    "reviewCount": "reviewCount",
    "reportTitle": "reportTitle",
}


@router.get("", response_model=Page[ReportPublic])
async def list_reports(
    user: CurrentUser,
    reports: Annotated[ReportRepository, Depends(report_repo)],
    product_id: Annotated[Optional[str], Query(alias="productId")] = None,
    status_filter: Annotated[
        Optional[ReportStatus],
        Query(alias="status", description="One of success | partial | failed."),
    ] = None,
    search: Annotated[
        Optional[str],
        Query(max_length=200, description="Case-insensitive match on reportTitle."),
    ] = None,
    page: PageQuery = 1,
    limit: LimitQuery = DEFAULT_PAGE_SIZE,
    sort_by: Annotated[
        Optional[str],
        Query(description=f"One of {sorted(_REPORT_SORT_FIELDS)}."),
    ] = None,
    sort_order: SortOrder = SortOrder.DESC,
) -> Page[ReportPublic]:
    """Paginated list of reports.

    All filtering, searching, sorting, and pagination happens at the
    Mongo layer — the client never receives more rows than fit on the
    current page. The dashboard's "Recent activity" panel uses
    ``page=1&limit=5`` against the same endpoint.
    """
    pid = to_object_id(product_id, field="productId") if product_id else None
    sort_field, order = resolve_sort(
        sort_by=sort_by,
        sort_order=sort_order,
        allowed=_REPORT_SORT_FIELDS,
        default_field="generatedAt",
    )
    query = (search or "").strip() or None
    status_value = status_filter.value if status_filter else None
    skip = skip_for(page, limit)
    items, total = await asyncio.gather(
        reports.list_for_user(
            user.id,
            product_id=pid,
            status=status_value,
            search=query,
            sort_field=sort_field,
            sort_order=order,
            limit=limit,
            skip=skip,
        ),
        reports.count_for_user(
            user.id, product_id=pid, status=status_value, search=query
        ),
    )
    return Page[ReportPublic].build(
        items=[ReportPublic.from_report(r) for r in items],
        page=page,
        limit=limit,
        total=total,
    )


@router.get("/{report_id}", response_model=ReportPublic)
async def get_report(
    user: CurrentUser,
    reports: Annotated[ReportRepository, Depends(report_repo)],
    report_id: Annotated[str, Path()],
) -> ReportPublic:
    rid = to_object_id(report_id, field="report_id")
    r = await reports.get(user_id=user.id, report_id=rid)
    return ReportPublic.from_report(r)


@router.post(
    "/products/{product_id}/run",
    response_model=ReportPublic,
    status_code=status.HTTP_202_ACCEPTED,
)
async def run_now(
    user: CurrentUser,
    products: Annotated[ProductRepository, Depends(product_repo)],
    background: BackgroundTasks,
    product_id: Annotated[str, Path()],
    wait: Annotated[bool, Query()] = False,
) -> ReportPublic:
    """Trigger an ad-hoc report run for ``product_id``.

    When ``wait=true`` the request blocks until the run finishes (useful
    for testing). Otherwise the work is queued onto FastAPI's background
    task runner and the caller polls ``GET /reports``.
    """
    pid = to_object_id(product_id, field="product_id")
    product = await products.get(user_id=user.id, product_id=pid)

    if wait:
        report = await generate_report_for_product(
            user_id=user.id, product=product, schedule_id=None
        )
        return ReportPublic.from_report(report)

    background.add_task(
        generate_report_for_product,
        user_id=user.id,
        product=product,
        schedule_id=None,
    )
    # We don't have a report row yet; return a stub describing the queued run.
    from app.models.report import Report
    stub = Report(
        productId=product.id,
        userId=user.id,
        reportTitle=f"{product.productName} — queued",
        status=ReportStatus.PARTIAL,
        reviewCount=0,
    )
    return ReportPublic.from_report(stub)
