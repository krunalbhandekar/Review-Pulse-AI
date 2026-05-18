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
from app.models.schedule import ScheduleCreate, SchedulePublic, ScheduleUpdate
from app.repositories.product_repo import ProductRepository
from app.repositories.schedule_repo import ScheduleRepository
from app.scheduler.runner import compute_next_run
from app.utils.ids import to_object_id

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.post("", response_model=SchedulePublic, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    payload: ScheduleCreate,
    user: CurrentUser,
    products: Annotated[ProductRepository, Depends(product_repo)],
    schedules: Annotated[ScheduleRepository, Depends(schedule_repo)],
) -> SchedulePublic:
    product_id = to_object_id(payload.productId, field="productId")
    # Verifies ownership: ProductRepository.get is scoped to user_id.
    await products.get(user_id=user.id, product_id=product_id)

    next_run = compute_next_run(
        frequency=payload.frequency,
        day_of_week=payload.dayOfWeek,
        days_of_week=payload.daysOfWeek,
        time_str=payload.time,
        tz_name=payload.timezone,
    )
    schedule = await schedules.create(
        user_id=user.id,
        product_id=product_id,
        data=payload,
        next_run_at=next_run,
    )
    return SchedulePublic.from_schedule(schedule)


_SCHEDULE_SORT_FIELDS = {
    "createdAt": "createdAt",
    "nextRunAt": "nextRunAt",
    "lastRunAt": "lastRunAt",
}


@router.get("", response_model=Page[SchedulePublic])
async def list_schedules(
    user: CurrentUser,
    schedules: Annotated[ScheduleRepository, Depends(schedule_repo)],
    product_id: Annotated[Optional[str], Query(alias="productId")] = None,
    enabled: Annotated[
        Optional[bool],
        Query(description="Filter to active (true) or paused (false) schedules."),
    ] = None,
    page: PageQuery = 1,
    limit: LimitQuery = DEFAULT_PAGE_SIZE,
    sort_by: Annotated[
        Optional[str],
        Query(description=f"One of {sorted(_SCHEDULE_SORT_FIELDS)}."),
    ] = None,
    sort_order: SortOrder = SortOrder.DESC,
) -> Page[SchedulePublic]:
    """Paginated list of schedules with optional filters + sort."""
    pid = to_object_id(product_id, field="productId") if product_id else None
    sort_field, order = resolve_sort(
        sort_by=sort_by,
        sort_order=sort_order,
        allowed=_SCHEDULE_SORT_FIELDS,
        default_field="createdAt",
    )
    skip = skip_for(page, limit)
    items, total = await asyncio.gather(
        schedules.list_for_user(
            user.id,
            product_id=pid,
            enabled=enabled,
            sort_field=sort_field,
            sort_order=order,
            skip=skip,
            limit=limit,
        ),
        schedules.count_for_user(user.id, product_id=pid, enabled=enabled),
    )
    return Page[SchedulePublic].build(
        items=[SchedulePublic.from_schedule(s) for s in items],
        page=page,
        limit=limit,
        total=total,
    )


@router.get("/{schedule_id}", response_model=SchedulePublic)
async def get_schedule(
    user: CurrentUser,
    schedules: Annotated[ScheduleRepository, Depends(schedule_repo)],
    schedule_id: Annotated[str, Path()],
) -> SchedulePublic:
    sid = to_object_id(schedule_id, field="schedule_id")
    s = await schedules.get(user_id=user.id, schedule_id=sid)
    return SchedulePublic.from_schedule(s)


@router.patch("/{schedule_id}", response_model=SchedulePublic)
async def update_schedule(
    payload: ScheduleUpdate,
    user: CurrentUser,
    schedules: Annotated[ScheduleRepository, Depends(schedule_repo)],
    schedule_id: Annotated[str, Path()],
) -> SchedulePublic:
    sid = to_object_id(schedule_id, field="schedule_id")
    s = await schedules.update(user_id=user.id, schedule_id=sid, data=payload)

    # Recompute nextRunAt if any timing-relevant field changed.
    timing_fields = {"frequency", "dayOfWeek", "daysOfWeek", "time", "timezone", "enabled"}
    if any(f in payload.model_fields_set for f in timing_fields):
        next_run = None
        if s.enabled:
            next_run = compute_next_run(
                frequency=s.frequency,
                day_of_week=s.dayOfWeek,
                days_of_week=s.daysOfWeek,
                time_str=s.time,
                tz_name=s.timezone,
            )
        await schedules.set_next_run(schedule_id=s.id, next_run_at=next_run)
        s.nextRunAt = next_run

    return SchedulePublic.from_schedule(s)


@router.delete(
    "/{schedule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_schedule(
    user: CurrentUser,
    schedules: Annotated[ScheduleRepository, Depends(schedule_repo)],
    schedule_id: Annotated[str, Path()],
) -> Response:
    sid = to_object_id(schedule_id, field="schedule_id")
    await schedules.delete(user_id=user.id, schedule_id=sid)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
