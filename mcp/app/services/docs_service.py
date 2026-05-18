"""Google Docs operations (multi-user)."""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.auth.credentials import build_credentials
from app.utils.logging import get_logger

log = get_logger("service.docs")


def _format_block(content: str) -> str:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    return f"\n[{ts}]\n{content}\n"


def _docs_service(creds):
    # ``cache_discovery=False`` silences a noisy log warning and avoids
    # an unnecessary on-disk cache for what is a stateless service.
    return build("docs", "v1", credentials=creds, cache_discovery=False)


async def append_to_doc(*, user_id: str, doc_id: str, content: str) -> dict[str, Any]:
    if not doc_id.strip() or not content.strip():
        return {"status": "error", "message": "doc_id and content are required"}

    creds = await build_credentials(user_id)

    def _do() -> dict[str, Any]:
        service = _docs_service(creds)
        try:
            service.documents().batchUpdate(
                documentId=doc_id,
                body={
                    "requests": [
                        {
                            "insertText": {
                                "endOfSegmentLocation": {},
                                "text": _format_block(content),
                            }
                        }
                    ]
                },
            ).execute()
            return {
                "status": "success",
                "message": "Content appended",
                "document_id": doc_id,
            }
        except HttpError as exc:
            log.error("docs.api_error", error=str(exc))
            return {
                "status": "error",
                "message": "Google Docs API error",
                "details": str(exc),
            }

    log.info("docs.append.start", user_id=user_id, doc_id=doc_id)
    return await asyncio.to_thread(_do)


async def create_doc(*, user_id: str, title: str, content: str) -> dict[str, Any]:
    creds = await build_credentials(user_id)

    def _do() -> dict[str, Any]:
        service = _docs_service(creds)
        try:
            doc = service.documents().create(body={"title": title}).execute()
            doc_id = doc["documentId"]
            if content.strip():
                service.documents().batchUpdate(
                    documentId=doc_id,
                    body={
                        "requests": [
                            {
                                "insertText": {
                                    "endOfSegmentLocation": {},
                                    "text": _format_block(content),
                                }
                            }
                        ]
                    },
                ).execute()
            return {
                "status": "success",
                "message": "Document created",
                "document_id": doc_id,
                "url": f"https://docs.google.com/document/d/{doc_id}/edit",
            }
        except HttpError as exc:
            log.error("docs.create_error", error=str(exc))
            return {
                "status": "error",
                "message": "Google Docs API error",
                "details": str(exc),
            }

    log.info("docs.create.start", user_id=user_id, title=title)
    return await asyncio.to_thread(_do)
