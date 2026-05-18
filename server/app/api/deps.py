"""Request-scoped dependencies — auth, repositories.

Auth here is session-cookie based: ``request.session["user_id"]`` is set
by the OAuth callback and removed by ``/auth/logout``. No JWT.
"""

from __future__ import annotations

from typing import Annotated

from bson import ObjectId
from fastapi import Depends, Request

from app.models.user import User
from app.repositories.product_repo import ProductRepository
from app.repositories.report_repo import ReportRepository
from app.repositories.schedule_repo import ScheduleRepository
from app.repositories.user_repo import UserRepository
from app.repositories.google_connection_repo import GoogleConnectionRepository
from app.utils.errors import NotAuthenticatedError


def session_user_id(request: Request) -> ObjectId:
    raw = request.session.get("user_id")
    if not raw:
        raise NotAuthenticatedError("Login required")
    return ObjectId(raw)


async def current_user(
    user_id: Annotated[ObjectId, Depends(session_user_id)],
) -> User:
    user = await UserRepository().get_by_id(user_id)
    if user is None:
        raise NotAuthenticatedError("Session user no longer exists")
    return user


# Repository factories — kept as thin Depends-able callables so tests can
# override with in-memory fakes.

def product_repo() -> ProductRepository:
    return ProductRepository()


def schedule_repo() -> ScheduleRepository:
    return ScheduleRepository()


def report_repo() -> ReportRepository:
    return ReportRepository()


def user_repo() -> UserRepository:
    return UserRepository()


def google_connection_repo() -> GoogleConnectionRepository:
    return GoogleConnectionRepository()


CurrentUser = Annotated[User, Depends(current_user)]
