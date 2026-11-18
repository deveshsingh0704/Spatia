"""
src/utils.py - Hardware, Timing, VRAM Telemetry, and Image Utilities.

Provides:
1. GPU cache clearing and garbage collection.
2. Synchronized CUDA timing wrappers (before and after inference).
3. VRAM allocation and peak tracking.
4. Labeled comparison grid rendering for benchmarking.
"""

import gc
import time
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
from contextlib import contextmanager
import torch
from PIL import Image, ImageDraw, ImageFont


def clear_gpu_memory() -> None:
    """
    Safely flushes CPU garbage and PyTorch CUDA memory caches.
    Essential when unloading models on 6GB VRAM GPUs.
    """
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()


def reset_peak_vram() -> None:
    """Resets the CUDA peak memory counter before running a generation."""
    if torch.cuda.is_available():
        torch.cuda.reset_peak_memory_stats()


def get_vram_usage() -> Dict[str, float]:
    """
    Measures current and peak VRAM usage in Megabytes (MB).
    
    Returns:
        Dict containing allocated_mb, reserved_mb, and peak_mb.
    """
    if not torch.cuda.is_available():
        return {"allocated_mb": 0.0, "reserved_mb": 0.0, "peak_mb": 0.0}

    allocated = torch.cuda.memory_allocated(0) / (1024**2)
    reserved = torch.cuda.memory_reserved(0) / (1024**2)
    peak = torch.cuda.max_memory_allocated(0) / (1024**2)
    return {
        "allocated_mb": round(allocated, 2),
        "reserved_mb": round(reserved, 2),
        "peak_mb": round(peak, 2),
    }


@contextmanager
def synchronized_timer():
    """
    Context manager for accurate wall-clock timing on CUDA devices.
    
    Calls torch.cuda.synchronize() before starting and after stopping
    to ensure asynchronous GPU execution does not corrupt timing records.
    
    Yields:
        timing_info (dict): Updated with 'duration' in seconds upon exit.
    """
    if torch.cuda.is_available():
        torch.cuda.synchronize()
    
    start_time = time.perf_counter()
    timing_info = {"duration": 0.0}
    try:
        yield timing_info
    finally:
        if torch.cuda.is_available():
            torch.cuda.synchronize()
        timing_info["duration"] = time.perf_counter() - start_time


def create_comparison_grid(
    records: List[Dict[str, Any]],
    output_path: Path,
    thumb_size: int = 256,
) -> Optional[Image.Image]:
    """
    Generates an annotated 2D image matrix from benchmark records.
    
    Rows = Unique (Model, Sampler) pairs.
    Columns = Steps (e.g. 10, 20, 30).
    """
    if not records:
        return None

    valid_records = [r for r in records if r.get("image_path") and Path(r["image_path"]).exists()]
    if not valid_records:
        return None

    # Determine unique rows and columns
    steps_list = sorted(list({r["steps"] for r in valid_records}))
    row_keys = []
    for r in valid_records:
        key = (r["model"], r["sampler"])
        if key not in row_keys:
            row_keys.append(key)

    thumb_w, thumb_h = thumb_size, thumb_size
    padding_top = 60
    padding_left = 220

    grid_w = padding_left + len(steps_list) * thumb_w
    grid_h = padding_top + len(row_keys) * thumb_h

    grid_img = Image.new("RGB", (grid_w, grid_h), color=(24, 24, 27))
    draw = ImageDraw.Draw(grid_img)

    try:
        font = ImageFont.load_default()
    except Exception:
        font = None

    # Draw Column Headers (Steps)
    for col_idx, step in enumerate(steps_list):
        x = padding_left + col_idx * thumb_w + thumb_w // 2 - 35
        y = 20
        draw.text((x, y), f"{step} Steps", fill=(240, 240, 240), font=font)

    # Fast lookup: (model, sampler, steps) -> record
    record_map = {(r["model"], r["sampler"], r["steps"]): r for r in valid_records}

    # Draw Rows and Paste Images
    for row_idx, (model_name, sampler_name) in enumerate(row_keys):
        row_y = padding_top + row_idx * thumb_h + thumb_h // 2 - 15
        
        # Label: Model and Sampler
        draw.text((15, row_y - 8), model_name, fill=(147, 197, 253), font=font)
        draw.text((15, row_y + 8), f"[{sampler_name}]", fill=(167, 139, 250), font=font)

        for col_idx, step in enumerate(steps_list):
            item = record_map.get((model_name, sampler_name, step))
            if item and item.get("image_path"):
                img_path = Path(item["image_path"])
                if img_path.exists():
                    thumb = Image.open(img_path).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                    paste_x = padding_left + col_idx * thumb_w
                    paste_y = padding_top + row_idx * thumb_h
                    grid_img.paste(thumb, (paste_x, paste_y))

                    # Overlay generation time & peak VRAM
                    gen_time = item.get("generation_time_seconds", 0.0)
                    peak_vram = item.get("peak_vram_mb", 0.0)
                    time_label = f"{gen_time:.2f}s | {peak_vram:.0f}MB"
                    draw.rectangle(
                        [paste_x + 5, paste_y + thumb_h - 22, paste_x + 130, paste_y + thumb_h - 4],
                        fill=(0, 0, 0, 190),
                    )
                    draw.text((paste_x + 8, paste_y + thumb_h - 20), time_label, fill=(74, 222, 128), font=font)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    grid_img.save(output_path)
    return grid_img
