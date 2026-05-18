"""HTTP surface of the MCP service.

Each endpoint takes a ``user_id`` and looks up that user's Google
credentials in MongoDB. No hardcoded creds; no global token cache.
"""

from __future__ import annotations

import secrets
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.services import append_to_doc, create_doc, send_email

router = APIRouter()


def _check_shared_secret(
    x_mcp_secret: Annotated[Optional[str], Header(alias="X-MCP-Secret")] = None,
) -> None:
    """Crude but effective network-level auth between server <-> MCP.

    The shared secret is set on the server, sent on every request, and
    checked here in constant time. If MCP is fronted by a private network
    you can disable this by leaving ``MCP_SHARED_SECRET`` empty.
    """
    if not settings.mcp_shared_secret:
        return
    if not x_mcp_secret or not secrets.compare_digest(
        x_mcp_secret, settings.mcp_shared_secret
    ):
        raise HTTPException(status_code=401, detail="Invalid or missing X-MCP-Secret")


SecretCheck = Depends(_check_shared_secret)


# ---- Request schemas ----------------------------------------------------


class AppendDocRequest(BaseModel):
    user_id: str = Field(..., description="Mongo ObjectId of the calling user")
    doc_id: str
    content: str


class CreateDocRequest(BaseModel):
    user_id: str
    title: str
    content: str = ""


class SendEmailRequest(BaseModel):
    user_id: str
    to: str
    subject: str
    body: str
    draft_only: bool = False


# ---- Endpoints ----------------------------------------------------------


@router.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": settings.app.APP_NAME,
        "version": settings.app.APP_VERSION,
    }


@router.get("/tools", dependencies=[SecretCheck])
async def list_tools() -> list[dict]:
    return [
        {"name": "append_to_doc", "description": "Append content to a Google Doc"},
        {"name": "create_doc", "description": "Create a new Google Doc"},
        {"name": "send_email", "description": "Send a Gmail message or create a draft"},
    ]


@router.post("/append_to_doc", dependencies=[SecretCheck])
async def append_to_doc_route(payload: AppendDocRequest) -> dict:
    return await append_to_doc(
        user_id=payload.user_id,
        doc_id=payload.doc_id,
        content=payload.content,
    )


@router.post("/create_doc", dependencies=[SecretCheck])
async def create_doc_route(payload: CreateDocRequest) -> dict:
    return await create_doc(
        user_id=payload.user_id,
        title=payload.title,
        content=payload.content,
    )


@router.post("/send_email", dependencies=[SecretCheck])
async def send_email_route(payload: SendEmailRequest) -> dict:
    return await send_email(
        user_id=payload.user_id,
        to=payload.to,
        subject=payload.subject,
        body=payload.body,
        draft_only=payload.draft_only,
    )
