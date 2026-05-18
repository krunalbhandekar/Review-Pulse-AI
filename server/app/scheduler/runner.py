"""APScheduler-backed dispatcher.

We deliberately keep schedule *metadata* in MongoDB (so users can edit
schedules from the API) and use APScheduler only as a heartbeat: every
``SCHEDULER_POLL_INTERVAL`` seconds the dispatcher fetches due schedules
and fans out report runs. This avoids the operational pain of keeping
APScheduler's own jobstore in sync with the schedules collection.

For horizontal scaling, the dispatcher can be moved behind a leader-lock
(e.g. via Redis SETNX or a MongoDB lease document) without changing the
per-schedule code path.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, time as time_t, timedelta, timezone
from typing import Iterable, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import pytz

from app.config import settings
from app.models.schedule import Frequency, Schedule
from app.utils.logging import get_logger

log = get_logger("scheduler.runner")


_WEEKDAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")


def _parse_hhmm(value: str) -> time_t:
    hh, mm = value.split(":")
    return time_t(hour=int(hh), minute=int(mm))


def compute_next_run(
    *,
    frequency: Frequency,
    day_of_week: Optional[str],
    days_of_week: Optional[Iterable[str]],
    time_str: str,
    tz_name: str,
    now: Optional[datetime] = None,
) -> datetime:
    """Compute the next run instant in **UTC**.

    The semantics:
      * ``daily``: next occurrence of ``time_str`` in ``tz_name``.
      * ``weekly``: next ``day_of_week`` at ``time_str``.
      * ``custom``: next member of ``days_of_week`` at ``time_str``.
    """
    try:
        tz = pytz.timezone(tz_name)
    except Exception as exc:  # noqa: BLE001 — unknown tz strings happen
        raise ValueError(f"Unknown timezone: {tz_name}") from exc

    now_utc = now or datetime.now(timezone.utc)
    now_local = now_utc.astimezone(tz)
    target_time = _parse_hhmm(time_str)

    candidate_local = tz.localize(
        datetime.combine(now_local.date(), target_time)
    ) if now_local.tzinfo is None else now_local.replace(
        hour=target_time.hour,
        minute=target_time.minute,
        second=0,
        microsecond=0,
    )

    def _advance_to_weekday(start: datetime, targets: set[int]) -> datetime:
        # ``weekday()``: Monday=0..Sunday=6
        cursor = start
        for _ in range(8):
            if cursor.weekday() in targets and cursor > now_local:
                return cursor
            cursor = cursor + timedelta(days=1)
        # Shouldn't happen with non-empty targets.
        return start + timedelta(days=7)

    if frequency == Frequency.DAILY:
        next_local = candidate_local
        if next_local <= now_local:
            next_local = next_local + timedelta(days=1)
    elif frequency == Frequency.WEEKLY:
        day = (day_of_week or "monday").lower()
        target_idx = _WEEKDAYS.index(day)
        next_local = _advance_to_weekday(candidate_local, {target_idx})
    elif frequency == Frequency.CUSTOM:
        days = list(days_of_week or [])
        if not days:
            raise ValueError("daysOfWeek required for frequency=custom")
        targets = {_WEEKDAYS.index(d.lower()) for d in days}
        next_local = _advance_to_weekday(candidate_local, targets)
    else:
        raise ValueError(f"Unknown frequency: {frequency}")

    return next_local.astimezone(timezone.utc)


class _SchedulerState:
    scheduler: AsyncIOScheduler | None = None


async def _dispatch_tick() -> None:
    """One pass of the dispatcher: pick due schedules, run them, advance ``nextRunAt``."""
    # Import inside the function — avoids a circular import with services.
    from app.repositories.product_repo import ProductRepository
    from app.repositories.schedule_repo import ScheduleRepository
    from app.services.report_service import generate_report_for_product

    schedules = ScheduleRepository()
    products = ProductRepository()
    now = datetime.now(timezone.utc)
    due = await schedules.list_due(before=now)
    if not due:
        return

    log.info("scheduler.tick", due_count=len(due))

    async def _run_one(schedule: Schedule) -> None:
        bound = log.bind(
            schedule_id=str(schedule.id),
            product_id=str(schedule.productId),
            user_id=str(schedule.userId),
        )
        try:
            product = await products.get(
                user_id=schedule.userId, product_id=schedule.productId
            )
        except Exception as exc:  # noqa: BLE001
            bound.error("scheduler.product_missing", error=str(exc))
            # Advance nextRunAt anyway so a deleted product doesn't make
            # us busy-loop on the same row.
            next_run = compute_next_run(
                frequency=schedule.frequency,
                day_of_week=schedule.dayOfWeek,
                days_of_week=schedule.daysOfWeek,
                time_str=schedule.time,
                tz_name=schedule.timezone,
            )
            await schedules.mark_ran(
                schedule_id=schedule.id, last_run_at=now, next_run_at=next_run
            )
            return

        try:
            await generate_report_for_product(
                user_id=schedule.userId,
                product=product,
                schedule_id=schedule.id,
            )
        except Exception as exc:  # noqa: BLE001
            bound.error("scheduler.run_failed", error=str(exc))

        next_run = compute_next_run(
            frequency=schedule.frequency,
            day_of_week=schedule.dayOfWeek,
            days_of_week=schedule.daysOfWeek,
            time_str=schedule.time,
            tz_name=schedule.timezone,
        )
        await schedules.mark_ran(
            schedule_id=schedule.id, last_run_at=now, next_run_at=next_run
        )

    await asyncio.gather(*(_run_one(s) for s in due), return_exceptions=True)


def start_scheduler() -> None:
    if _SchedulerState.scheduler is not None:
        return
    sched = AsyncIOScheduler(timezone=pytz.UTC)
    sched.add_job(
        _dispatch_tick,
        trigger=IntervalTrigger(seconds=settings.scheduler.POLL_INTERVAL),
        id="dispatch_tick",
        max_instances=1,
        coalesce=True,
        replace_existing=True,
    )
    sched.start()
    _SchedulerState.scheduler = sched
    log.info("scheduler.started", interval=settings.scheduler.POLL_INTERVAL)


def shutdown_scheduler() -> None:
    if _SchedulerState.scheduler is None:
        return
    _SchedulerState.scheduler.shutdown(wait=False)
    _SchedulerState.scheduler = None
    log.info("scheduler.stopped")
