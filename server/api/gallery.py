import math
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete, desc, asc
from models.user import User, get_db
from models.gallery import Generation, Library, LibraryItem
from api.deps import get_current_user
from services.storage import get_storage_service, OUTPUTS_GALLERY_DIR

router = APIRouter(prefix="/api/gallery", tags=["Gallery & Libraries"])


# Schemas
class GenerationUpdateSchema(BaseModel):
    title: Optional[str] = None
    is_favorite: Optional[bool] = None


class LibraryCreateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class LibraryItemAddSchema(BaseModel):
    generation_id: str


# Endpoints
@router.get("")
async def get_gallery_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(9, ge=1, le=100),
    search: Optional[str] = Query(None),
    model_name: Optional[str] = Query(None),
    sampler_name: Optional[str] = Query(None),
    is_favorite: Optional[bool] = Query(None),
    library_id: Optional[str] = Query(None),
    sort_by: str = Query("created_at_desc", regex="^(created_at_desc|created_at_asc|steps_desc|latency_desc)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns a paginated list of generated architectural mockups owned by the current user.
    """
    query = select(Generation).filter(Generation.user_id == current_user.id)

    if library_id:
        query = query.join(LibraryItem, Generation.id == LibraryItem.generation_id).filter(LibraryItem.library_id == library_id)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter((Generation.title.ilike(search_pattern)) | (Generation.prompt.ilike(search_pattern)))

    if model_name:
        query = query.filter(Generation.model_name == model_name)

    if sampler_name:
        query = query.filter(Generation.sampler_name == sampler_name)

    if is_favorite is not None:
        query = query.filter(Generation.is_favorite == is_favorite)

    # Count total matching records
    count_subq = query.subquery()
    count_stmt = select(func.count()).select_from(count_subq)
    total_records = (await db.execute(count_stmt)).scalar() or 0

    # Sorting
    if sort_by == "created_at_asc":
        query = query.order_by(asc(Generation.created_at))
    elif sort_by == "steps_desc":
        query = query.order_by(desc(Generation.steps))
    elif sort_by == "latency_desc":
        query = query.order_by(desc(Generation.latency_sec))
    else:
        query = query.order_by(desc(Generation.created_at))

    # Pagination offset & limit
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    total_pages = math.ceil(total_records / page_size) if total_records > 0 else 1

    storage = get_storage_service()
    formatted_items = []
    for item in items:
        resolved_url = storage.resolve_url(item.image_url, item.storage_key)
        formatted_items.append({
            "id": item.id,
            "chat_id": item.chat_id,
            "title": item.title,
            "image_url": resolved_url,
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
            "is_favorite": item.is_favorite,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        })

    return {
        "items": formatted_items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_records": total_records,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }


@router.get("/{generation_id}")
async def get_generation_by_id(
    generation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch complete metadata for a single generation owned by the current user."""
    stmt = select(Generation).filter(Generation.id == generation_id, Generation.user_id == current_user.id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Generation not found")

    storage = get_storage_service()
    resolved_url = storage.resolve_url(item.image_url, item.storage_key)

    return {
        "id": item.id,
        "chat_id": item.chat_id,
        "title": item.title,
        "image_url": resolved_url,
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
        "is_favorite": item.is_favorite,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


@router.get("/{generation_id}/download")
async def download_generation(generation_id: str, db: AsyncSession = Depends(get_db)):
    """Download a generated image with forced attachment filename (supports S3 presigned & local files)."""
    stmt = select(Generation).filter(Generation.id == generation_id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Generation not found")

    filename = f"latentcraft_seed{item.seed}_{item.resolution}_{item.id[:8]}.png"
    storage = get_storage_service()
    resolved_url = storage.resolve_url(
        item.image_url,
        item.storage_key,
        expires_in=300,
        download_filename=filename,
    )
    if resolved_url and resolved_url.startswith("http://localhost:8001/outputs/gallery/"):
        local_file = OUTPUTS_GALLERY_DIR / item.storage_key
        if local_file.exists():
            return FileResponse(path=local_file, filename=filename, media_type="image/png")

    if not resolved_url:
        raise HTTPException(status_code=404, detail="Image URL unavailable")
    return RedirectResponse(url=resolved_url)


@router.patch("/{generation_id}")
async def update_generation(
    generation_id: str,
    payload: GenerationUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update title or favorite status of a generation owned by the current user."""
    stmt = select(Generation).filter(Generation.id == generation_id, Generation.user_id == current_user.id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Generation not found")

    if payload.title is not None:
        item.title = payload.title.strip()
    if payload.is_favorite is not None:
        item.is_favorite = payload.is_favorite

    await db.commit()
    await db.refresh(item)
    return {"status": "success", "message": "Updated successfully", "title": item.title, "is_favorite": item.is_favorite}


@router.delete("/{generation_id}")
async def delete_generation(
    generation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes a generation owned by the current user from DB AND storage.
    """
    stmt = select(Generation).filter(Generation.id == generation_id, Generation.user_id == current_user.id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Generation not found")

    storage_key = item.storage_key
    storage = get_storage_service()

    # Delete physically
    deleted_storage = storage.delete_image(storage_key)

    # Delete from DB
    await db.delete(item)
    await db.commit()

    return {
        "status": "success",
        "message": f"Generation {generation_id} deleted successfully",
        "storage_cleaned": deleted_storage
    }


# =====================================================================
# Custom Libraries & Collections Endpoints
# =====================================================================

@router.get("/libraries/all")
async def list_libraries(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List custom user libraries owned by the current user."""
    stmt = (
        select(
            Library.id,
            Library.name,
            Library.description,
            Library.cover_image_url,
            Library.created_at,
            func.count(LibraryItem.id).label("item_count")
        )
        .outerjoin(LibraryItem, Library.id == LibraryItem.library_id)
        .filter(Library.user_id == current_user.id)
        .group_by(Library.id)
        .order_by(desc(Library.created_at))
    )
    result = await db.execute(stmt)
    rows = result.all()

    storage = get_storage_service()
    libraries = []
    for r in rows:
        libraries.append({
            "id": r[0],
            "name": r[1],
            "description": r[2],
            "cover_image_url": storage.resolve_url(r[3]),
            "created_at": r[4].isoformat() if r[4] else None,
            "item_count": r[5]
        })

    return {"libraries": libraries}


@router.post("/libraries/create")
async def create_library(
    payload: LibraryCreateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new custom library/collection owned by the current user."""
    new_lib = Library(user_id=current_user.id, name=payload.name.strip(), description=payload.description)
    db.add(new_lib)
    await db.commit()
    await db.refresh(new_lib)
    return {
        "status": "success",
        "library": {
            "id": new_lib.id,
            "name": new_lib.name,
            "description": new_lib.description,
            "item_count": 0
        }
    }


@router.delete("/libraries/{library_id}")
async def delete_library(
    library_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a library collection owned by the current user (generations remain intact)."""
    stmt = select(Library).filter(Library.id == library_id, Library.user_id == current_user.id)
    result = await db.execute(stmt)
    lib = result.scalar_one_or_none()
    if not lib:
        raise HTTPException(status_code=404, detail="Library not found")

    await db.delete(lib)
    await db.commit()
    return {"status": "success", "message": f"Library '{lib.name}' removed"}


@router.post("/libraries/{library_id}/items")
async def add_item_to_library(
    library_id: str,
    payload: LibraryItemAddSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a generation owned by the current user to their library."""
    lib = (await db.execute(select(Library).filter(Library.id == library_id, Library.user_id == current_user.id))).scalar_one_or_none()
    if not lib:
        raise HTTPException(status_code=404, detail="Library not found")

    gen = (await db.execute(select(Generation).filter(Generation.id == payload.generation_id, Generation.user_id == current_user.id))).scalar_one_or_none()
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")

    # Check if already added
    exists = (
        await db.execute(
            select(LibraryItem).filter(
                LibraryItem.library_id == library_id,
                LibraryItem.generation_id == payload.generation_id
            )
        )
    ).scalar_one_or_none()

    if not exists:
        item = LibraryItem(library_id=library_id, generation_id=payload.generation_id)
        db.add(item)
        if not lib.cover_image_url:
            lib.cover_image_url = gen.image_url
        await db.commit()

    return {"status": "success", "message": "Added to library"}


@router.delete("/libraries/{library_id}/items/{generation_id}")
async def remove_item_from_library(
    library_id: str,
    generation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a generation from a specific library owned by the current user."""
    lib = (await db.execute(select(Library).filter(Library.id == library_id, Library.user_id == current_user.id))).scalar_one_or_none()
    if not lib:
        raise HTTPException(status_code=404, detail="Library not found")
    stmt = delete(LibraryItem).filter(
        LibraryItem.library_id == library_id,
        LibraryItem.generation_id == generation_id
    )
    result = await db.execute(stmt)
    await db.commit()
    return {"status": "success", "message": "Removed from library"}

