from __future__ import annotations

import asyncio
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Path, Query, Response, status

from app.api.deps import CurrentUser, product_repo, schedule_repo
from app.models.pagination import (
    DEFAULT_PAGE_SIZE,
    LimitQuery,
    Page,
    PageQuery,
    SortOrder,
    resolve_sort,
    skip_for,
)
from app.models.product import ProductCreate, ProductPublic, ProductUpdate
from app.repositories.product_repo import ProductRepository
from app.repositories.schedule_repo import ScheduleRepository
from app.utils.ids import to_object_id
from app.utils.logging import get_logger

router = APIRouter(prefix="/products", tags=["products"])

log = get_logger("app.products")


@router.post("", response_model=ProductPublic, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    user: CurrentUser,
    repo: Annotated[ProductRepository, Depends(product_repo)],
) -> ProductPublic:
    product = await repo.create(user_id=user.id, data=payload)
    log.info(
        "product.created",
        user_id=str(user.id),
        product_id=str(product.id),
        incoming_email_mode=payload.emailMode.value,
        stored_email_mode=product.emailMode.value,
    )
    return ProductPublic.from_product(product)


_PRODUCT_SORT_FIELDS = {
    # wire name  -> Mongo field
    "createdAt": "createdAt",
    "updatedAt": "updatedAt",
    "productName": "productName",
}


@router.get("", response_model=Page[ProductPublic])
async def list_products(
    user: CurrentUser,
    repo: Annotated[ProductRepository, Depends(product_repo)],
    page: PageQuery = 1,
    limit: LimitQuery = DEFAULT_PAGE_SIZE,
    search: Annotated[
        Optional[str],
        Query(
            max_length=200,
            description="Case-insensitive substring across productName, "
            "playstoreAppId, appstoreAppId, emailTo.",
        ),
    ] = None,
    sort_by: Annotated[
        Optional[str],
        Query(description=f"One of {sorted(_PRODUCT_SORT_FIELDS)}."),
    ] = None,
    sort_order: SortOrder = SortOrder.DESC,
) -> Page[ProductPublic]:
    """Paginated list of the caller's products.

    Filtering, searching, sorting, and pagination all run server-side
    so the client never receives more rows than it renders.
    """
    sort_field, order = resolve_sort(
        sort_by=sort_by,
        sort_order=sort_order,
        allowed=_PRODUCT_SORT_FIELDS,
        default_field="createdAt",
    )
    # Treat blank / whitespace-only search as "no filter" so the client
    # can pass the raw input box value without trimming.
    query = (search or "").strip() or None
    skip = skip_for(page, limit)
    products, total = await asyncio.gather(
        repo.list_for_user(
            user.id,
            skip=skip,
            limit=limit,
            search=query,
            sort_field=sort_field,
            sort_order=order,
        ),
        repo.count_for_user(user.id, search=query),
    )
    return Page[ProductPublic].build(
        items=[ProductPublic.from_product(p) for p in products],
        page=page,
        limit=limit,
        total=total,
    )


@router.get("/{product_id}", response_model=ProductPublic)
async def get_product(
    user: CurrentUser,
    repo: Annotated[ProductRepository, Depends(product_repo)],
    product_id: Annotated[str, Path()],
) -> ProductPublic:
    pid = to_object_id(product_id, field="product_id")
    product = await repo.get(user_id=user.id, product_id=pid)
    return ProductPublic.from_product(product)


@router.patch("/{product_id}", response_model=ProductPublic)
async def update_product(
    payload: ProductUpdate,
    user: CurrentUser,
    repo: Annotated[ProductRepository, Depends(product_repo)],
    product_id: Annotated[str, Path()],
) -> ProductPublic:
    pid = to_object_id(product_id, field="product_id")
    product = await repo.update(user_id=user.id, product_id=pid, data=payload)
    log.info(
        "product.updated",
        user_id=str(user.id),
        product_id=str(product.id),
        # None when the client didn't send the field — distinguishes
        # "leave alone" from an explicit mode change.
        incoming_email_mode=payload.emailMode.value if payload.emailMode else None,
        stored_email_mode=product.emailMode.value,
    )
    return ProductPublic.from_product(product)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_product(
    user: CurrentUser,
    repo: Annotated[ProductRepository, Depends(product_repo)],
    schedules: Annotated[ScheduleRepository, Depends(schedule_repo)],
    product_id: Annotated[str, Path()],
) -> Response:
    pid = to_object_id(product_id, field="product_id")
    # Cascade — schedules belong to a product and are useless without it.
    # Reports are kept (historical record) but orphaned safely.
    await schedules.delete_by_product(user_id=user.id, product_id=pid)
    await repo.delete(user_id=user.id, product_id=pid)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
