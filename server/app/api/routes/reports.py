from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Path, Query, status

from app.api.deps import CurrentUser, product_repo, report_repo
from app.models.report import ReportPublic
from app.repositories.product_repo import ProductRepository
from app.repositories.report_repo import ReportRepository
from app.services.report_service import generate_report_for_product
from app.utils.ids import to_object_id

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=list[ReportPublic])
async def list_reports(
    user: CurrentUser,
    reports: Annotated[ReportRepository, Depends(report_repo)],
    product_id: Annotated[Optional[str], Query(alias="productId")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    skip: Annotated[int, Query(ge=0)] = 0,
) -> list[ReportPublic]:
    pid = to_object_id(product_id, field="productId") if product_id else None
    items = await reports.list_for_user(
        user.id, product_id=pid, limit=limit, skip=skip
    )
    return [ReportPublic.from_report(r) for r in items]


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
    from app.models.report import Report, ReportStatus
    stub = Report(
        productId=product.id,
        userId=user.id,
        reportTitle=f"{product.productName} — queued",
        status=ReportStatus.PARTIAL,
        reviewCount=0,
    )
    return ReportPublic.from_report(stub)
