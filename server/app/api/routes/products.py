from __future__ import annotations

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Response, status

from app.api.deps import CurrentUser, product_repo, schedule_repo
from app.models.pagination import (
    DEFAULT_PAGE_SIZE,
    LimitQuery,
    Page,
    PageQuery,
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


@router.get("", response_model=Page[ProductPublic])
async def list_products(
    user: CurrentUser,
    repo: Annotated[ProductRepository, Depends(product_repo)],
    page: PageQuery = 1,
    limit: LimitQuery = DEFAULT_PAGE_SIZE,
) -> Page[ProductPublic]:
    """Paginated list of the caller's products, newest first."""
    skip = skip_for(page, limit)
    products, total = await asyncio.gather(
        repo.list_for_user(user.id, skip=skip, limit=limit),
        repo.count_for_user(user.id),
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
