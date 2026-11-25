import json
import secrets
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc

from models.user import User, get_db
from models.gallery import ChatSession, Generation
from api.deps import get_optional_current_user
from services.storage import get_storage_service

router = APIRouter(prefix="/api/chats", tags=["Chat Sessions"])


class ChatCreateSchema(BaseModel):
    title: Optional[str] = Field(default="Untitled Studio Project", max_length=255)
    model_name: str = "Stable Diffusion v1.5 (Fine-Tuned)"
    sampler_name: str = "DDIM"
    steps: int = 20
    guidance_scale: float = 7.5
    seed: int = 42
    resolution: str = "512x512"
    negative_tags: List[str] = Field(default_factory=list)
    is_saved: bool = False


class ChatUpdateSchema(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    is_saved: Optional[bool] = None
    model_name: Optional[str] = None
    sampler_name: Optional[str] = None
    steps: Optional[int] = None
    guidance_scale: Optional[float] = None
    seed: Optional[int] = None
    resolution: Optional[str] = None
    negative_tags: Optional[List[str]] = None


class ChatShareSchema(BaseModel):
    is_shared: bool = True


def _parse_negative_tags(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(x).strip() for x in parsed if str(x).strip()]
    except Exception:
        pass
    return [t.strip() for t in raw.split(",") if t.strip()]


def _serialize_chat(chat: ChatSession, message_count: int = 0) -> Dict[str, Any]:
    storage = get_storage_service()
    resolved_preview = storage.resolve_url(chat.preview_image_url) if chat.preview_image_url else None
    return {
        "id": chat.id,
        "title": chat.title,
        "model_name": chat.model_name,
        "sampler_name": chat.sampler_name,
        "steps": chat.steps,
        "guidance_scale": chat.guidance_scale,
        "seed": chat.seed,
        "resolution": chat.resolution,
        "negative_tags": _parse_negative_tags(chat.negative_tags),
        "preview_image_url": resolved_preview,
        "is_saved": bool(chat.is_saved),
        "is_shared": bool(chat.is_shared),
        "share_token": chat.share_token if chat.is_shared else None,
        "message_count": message_count,
        "created_at": chat.created_at.isoformat() if chat.created_at else None,
        "updated_at": chat.updated_at.isoformat() if chat.updated_at else None,
    }


def _serialize_generation(item: Generation) -> Dict[str, Any]:
    storage = get_storage_service()
    return {
        "id": item.id,
        "chat_id": item.chat_id,
        "title": item.title,
        "image_url": storage.resolve_url(item.image_url, item.storage_key),
        "storage_key": item.storage_key,
        "prompt": item.prompt,
        "negative_prompt": item.negative_prompt,
        "seed": item.seed,
        "model_name": item.model_name,
        "sampler_name": item.sampler_name,
        "steps": item.steps,
        "guidance_scale": item.guidance_scale,
        "resolution": item.resolution,
        "width": item.width,
        "height": item.height,
        "latency_sec": item.latency_sec,
        "peak_vram_mb": item.peak_vram_mb,
        "is_favorite": bool(item.is_favorite),
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


@router.get("")
async def list_chat_sessions(
    search: Optional[str] = Query(None),
    saved_only: bool = Query(False),
    shared_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List saved chat sessions with image counts and AWS S3 presigned preview thumbnails."""
    stmt = (
        select(ChatSession, func.count(Generation.id).label("msg_count"))
        .outerjoin(Generation, Generation.chat_id == ChatSession.id)
        .group_by(ChatSession.id)
    )

    if search and search.strip():
        pattern = f"%{search.strip()}%"
        stmt = stmt.filter(ChatSession.title.ilike(pattern))
    if saved_only:
        stmt = stmt.filter(ChatSession.is_saved == True)
    if shared_only:
        stmt = stmt.filter(ChatSession.is_shared == True)

    stmt = stmt.order_by(desc(ChatSession.is_saved), desc(ChatSession.updated_at)).limit(limit)
    rows = (await db.execute(stmt)).all()

    return {
        "chats": [_serialize_chat(chat, count) for chat, count in rows],
        "total": len(rows),
    }


@router.post("")
async def create_chat_session(
    payload: ChatCreateSchema,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new persistent chat project with a unique UUID."""
    chat = ChatSession(
        user_id=current_user.id if current_user else None,
        title=(payload.title or "Untitled Studio Project").strip(),
        model_name=payload.model_name,
        sampler_name=payload.sampler_name,
        steps=payload.steps,
        guidance_scale=payload.guidance_scale,
        seed=payload.seed,
        resolution=payload.resolution,
        negative_tags=json.dumps(payload.negative_tags),
        is_saved=payload.is_saved,
    )
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return {"status": "success", "chat": _serialize_chat(chat, 0)}


@router.get("/shared/{share_token}")
async def get_shared_chat_session(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public read-only endpoint for viewing a shared chat session and its generated images."""
    stmt = select(ChatSession).filter(
        ChatSession.share_token == share_token,
        ChatSession.is_shared == True,
    )
    chat = (await db.execute(stmt)).scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Shared chat session not found or sharing is disabled")

    gen_stmt = (
        select(Generation)
        .filter(Generation.chat_id == chat.id)
        .order_by(asc(Generation.created_at))
    )
    generations = (await db.execute(gen_stmt)).scalars().all()

    return {
        "chat": _serialize_chat(chat, len(generations)),
        "messages": [_serialize_generation(g) for g in generations],
    }


@router.get("/{chat_id}")
async def get_chat_session(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Load a chat session, its saved parameters, and its full chronological generation history."""
    chat = (await db.execute(select(ChatSession).filter(ChatSession.id == chat_id))).scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")

    gen_stmt = (
        select(Generation)
        .filter(Generation.chat_id == chat.id)
        .order_by(asc(Generation.created_at))
    )
    generations = (await db.execute(gen_stmt)).scalars().all()

    return {
        "chat": _serialize_chat(chat, len(generations)),
        "messages": [_serialize_generation(g) for g in generations],
    }


@router.patch("/{chat_id}")
async def update_chat_session(
    chat_id: str,
    payload: ChatUpdateSchema,
    db: AsyncSession = Depends(get_db),
):
    """Update chat title, saved bookmark state, or workspace parameter snapshot."""
    chat = (await db.execute(select(ChatSession).filter(ChatSession.id == chat_id))).scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if payload.title is not None and payload.title.strip():
        chat.title = payload.title.strip()
    if payload.is_saved is not None:
        chat.is_saved = payload.is_saved
    if payload.model_name is not None:
        chat.model_name = payload.model_name
    if payload.sampler_name is not None:
        chat.sampler_name = payload.sampler_name
    if payload.steps is not None:
        chat.steps = payload.steps
    if payload.guidance_scale is not None:
        chat.guidance_scale = payload.guidance_scale
    if payload.seed is not None:
        chat.seed = payload.seed
    if payload.resolution is not None:
        chat.resolution = payload.resolution
    if payload.negative_tags is not None:
        chat.negative_tags = json.dumps(payload.negative_tags)

    chat.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(chat)

    count = (
        await db.execute(select(func.count(Generation.id)).filter(Generation.chat_id == chat.id))
    ).scalar() or 0
    return {"status": "success", "chat": _serialize_chat(chat, count)}


@router.post("/{chat_id}/share")
async def toggle_share_chat_session(
    chat_id: str,
    payload: ChatShareSchema,
    db: AsyncSession = Depends(get_db),
):
    """Enable or disable public read-only sharing for a chat session."""
    chat = (await db.execute(select(ChatSession).filter(ChatSession.id == chat_id))).scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")

    chat.is_shared = payload.is_shared
    if payload.is_shared and not chat.share_token:
        chat.share_token = secrets.token_urlsafe(12)
    chat.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(chat)
    return {
        "status": "success",
        "chat_id": chat.id,
        "is_shared": bool(chat.is_shared),
        "share_token": chat.share_token if chat.is_shared else None,
    }


@router.delete("/{chat_id}")
async def delete_chat_session(
    chat_id: str,
    delete_images: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session (preserving Gallery images by default unless delete_images=true)."""
    chat = (await db.execute(select(ChatSession).filter(ChatSession.id == chat_id))).scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if delete_images:
        storage = get_storage_service()
        gens = (await db.execute(select(Generation).filter(Generation.chat_id == chat.id))).scalars().all()
        for g in gens:
            storage.delete_image(g.storage_key)
            await db.delete(g)

    await db.delete(chat)
    await db.commit()
    return {"status": "success", "message": f"Chat session '{chat.title}' deleted"}

