"""Gmail send/draft operations (multi-user)."""

from __future__ import annotations

import asyncio
import base64
from email.mime.text import MIMEText
from typing import Any

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.auth.credentials import build_credentials
from app.utils.logging import get_logger

log = get_logger("service.gmail")


def _build_message(to: str, subject: str, body: str) -> dict[str, str]:
    message = MIMEText(body)
    message["to"] = to
    message["subject"] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    return {"raw": raw}


def _gmail_service(creds):
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


async def send_email(
    *,
    user_id: str,
    to: str,
    subject: str,
    body: str,
    draft_only: bool = False,
) -> dict[str, Any]:
    if not to or not subject or not body:
        return {"status": "error", "message": "to, subject, and body are required"}

    creds = await build_credentials(user_id)

    def _do() -> dict[str, Any]:
        service = _gmail_service(creds)
        message = _build_message(to, subject, body)
        try:
            if draft_only:
                draft = service.users().drafts().create(
                    userId="me", body={"message": message}
                ).execute()
                return {
                    "status": "success",
                    "mode": "draft",
                    "draft_id": draft.get("id"),
                }
            sent = service.users().messages().send(
                userId="me", body=message
            ).execute()
            return {
                "status": "success",
                "mode": "send",
                "message_id": sent.get("id"),
                "thread_id": sent.get("threadId"),
            }
        except HttpError as exc:
            log.error("gmail.api_error", error=str(exc))
            return {
                "status": "error",
                "message": "Gmail API error",
                "details": str(exc),
            }

    log.info(
        "gmail.start",
        user_id=user_id,
        mode="draft" if draft_only else "send",
        to=to,
    )
    return await asyncio.to_thread(_do)
