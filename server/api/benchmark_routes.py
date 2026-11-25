import os
import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, asc, delete
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    torch = None  # type: ignore
    TORCH_AVAILABLE = False

from models.user import User, get_db, AsyncSessionLocal
from models.benchmark import BenchmarkRun
from api.deps import get_current_user
from services.storage import get_storage_service
import psutil


def get_live_hardware_telemetry() -> Dict[str, Any]:
    """Dynamically queries active GPU, VRAM, and host RAM."""
    cuda_avail = bool(TORCH_AVAILABLE and torch is not None and torch.cuda.is_available())
    mem = psutil.virtual_memory()

    total_ram_gb = round(mem.total / (1024**3), 2)
    used_ram_gb = round(mem.used / (1024**3), 2)
    ram_usage_pct = mem.percent

    if cuda_avail:
        gpu_name = torch.cuda.get_device_name(0)
        vram_props = torch.cuda.get_device_properties(0)
        total_vram_gb = round(vram_props.total_memory / (1024**3), 2)
        allocated_vram_gb = round(torch.cuda.memory_allocated(0) / (1024**3), 2)
        vram_pct = int(min(100, (allocated_vram_gb / max(0.1, total_vram_gb)) * 100))
        return {
            "node": "LOCAL-NODE-GPU",
            "device_name": f"{gpu_name} ({vram_pct}% VRAM Active)",
            "vram_total_gb": total_vram_gb,
            "vram_ready_percent": max(5, vram_pct),
            "vram_used_gb": allocated_vram_gb,
            "ram_total_gb": total_ram_gb,
            "ram_used_gb": used_ram_gb,
            "ram_usage_pct": ram_usage_pct,
            "cuda_available": True,
        }
    return {
        "node": "LOCAL-NODE-CPU",
        "device_name": "Host CPU Execution (CUDA Disabled)",
        "vram_total_gb": 0.0,
        "vram_ready_percent": 0,
        "vram_used_gb": 0.0,
        "ram_total_gb": total_ram_gb,
        "ram_used_gb": used_ram_gb,
        "ram_usage_pct": ram_usage_pct,
        "cuda_available": False,
    }


router = APIRouter(prefix="/api/benchmark", tags=["Benchmark Lab"])


class RunBenchmarkRequest(BaseModel):
    models: List[str] = ["Stable Diffusion v1.5 (Fine-Tuned)"]
    samplers: List[str] = ["DDIM", "DDPM"]
    seed: int = 42
    steps_list: List[int] = [10, 25, 50]


@router.get("")
async def get_benchmark_dashboard(
    model: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns real KPIs, convergence curves, and hardware specs from PostgreSQL for the current user."""
    hw = get_live_hardware_telemetry()
    storage = get_storage_service()

    # Clean up any legacy seeded fake rows once
    await db.execute(delete(BenchmarkRun).where(BenchmarkRun.batch_id == "initial_baseline_batch"))
    await db.commit()

    stmt = (
        select(BenchmarkRun)
        .filter(
            BenchmarkRun.status == "COMPLETED",
            BenchmarkRun.batch_id != "initial_baseline_batch",
            BenchmarkRun.user_id == current_user.id,
        )
        .order_by(desc(BenchmarkRun.created_at))
        .limit(100)
    )
    all_runs = (await db.execute(stmt)).scalars().all()
    model_runs = [r for r in all_runs if not model or r.model_name == model] or all_runs

    pytorch_ver = f"PyTorch {torch.__version__}" if TORCH_AVAILABLE and torch is not None else "Serverless Worker"
    system_payload = {
        "node": hw["node"],
        "device_name": hw["device_name"],
        "vram_total_gb": hw["vram_total_gb"],
        "vram_ready_percent": hw["vram_ready_percent"],
        "vram_used_gb": hw["vram_used_gb"],
        "pytorch_version": pytorch_ver,
        "prd_spec": "REAL-TIME TELEMETRY",
    }

    if not model_runs:
        return {
            "system": system_payload,
            "kpis": {
                "optimal_operating_point": "No runs yet",
                "time_saved_percent": 0.0,
                "tradeoff": "Run a Sampler Matrix sweep to measure",
                "fid_score": 0.0,
                "fid_target": 5.0,
                "fid_delta_from_baseline": 0.0,
                "perceptual_quality_index": 0.0,
                "speedup": "0x",
                "wall_clock_time_sec": 0.0,
                "baseline_time_sec": 0.0,
                "compute_cost": "$0.00",
                "dataset": "0 Real Runs",
                "features_count": "Run a sweep in Studio",
                "eval_eta": 0.00,
            },
            "fid_curve": [],
            "latency_profile": [],
            "qualitative_comparison": [],
            "checkpoints": [],
        }

    step_groups: Dict[int, Dict[str, Any]] = {}
    for r in model_runs:
        s = r.steps
        if s not in step_groups:
            step_groups[s] = {"steps": s, "ddim_fid": None, "ddpm_fid": None, "ddim_latency": None, "ddpm_latency": None}
        if "DDIM" in r.sampler_name.upper():
            if step_groups[s]["ddim_fid"] is None:
                step_groups[s]["ddim_fid"] = r.fid_score
            if step_groups[s]["ddim_latency"] is None:
                step_groups[s]["ddim_latency"] = r.latency_sec
        elif "DDPM" in r.sampler_name.upper():
            if step_groups[s]["ddpm_fid"] is None:
                step_groups[s]["ddpm_fid"] = r.fid_score
            if step_groups[s]["ddpm_latency"] is None:
                step_groups[s]["ddpm_latency"] = r.latency_sec

    sorted_steps = sorted(step_groups.keys())
    fid_curve = []
    latency_profile = []
    max_lat = max((r.latency_sec for r in model_runs), default=1.0)

    for s in sorted_steps:
        data = step_groups[s]
        d_fid = data["ddim_fid"]
        p_fid = data["ddpm_fid"]
        fid_curve.append({
            "steps": s,
            "ddim_fid": round(d_fid, 2) if d_fid is not None else None,
            "ddpm_fid": round(p_fid, 2) if p_fid is not None else None,
            "optimal": s == 50,
            "label": f"{s} Steps",
        })

        lat = data["ddim_latency"] if data["ddim_latency"] is not None else (data["ddpm_latency"] or 0.0)
        speedup = f"{round(max_lat / max(0.01, lat), 1)}x"
        latency_profile.append({
            "steps": s,
            "latency": round(lat, 2),
            "label": f"{s} Steps",
            "speedup": speedup,
            "highlight": s == 50,
            "baseline": lat == max_lat,
        })

    best_run = min(model_runs, key=lambda r: r.fid_score if r.fid_score is not None else 999.0)
    worst_lat = max((r.latency_sec for r in model_runs), default=best_run.latency_sec)
    speedup_ratio = round(worst_lat / max(0.01, best_run.latency_sec), 1)
    time_saved = round(max(0.0, (1.0 - (best_run.latency_sec / max(0.01, worst_lat))) * 100.0), 1)

    kpis = {
        "optimal_operating_point": f"{best_run.sampler_name} @ {best_run.steps}",
        "time_saved_percent": time_saved,
        "tradeoff": f"Across {len(model_runs)} real benchmark runs",
        "fid_score": round(best_run.fid_score, 2),
        "fid_target": 5.0,
        "fid_delta_from_baseline": round(max(r.fid_score for r in model_runs) - best_run.fid_score, 2),
        "perceptual_quality_index": round(max(0.0, 100.0 - best_run.fid_score), 1),
        "speedup": f"{speedup_ratio}x",
        "wall_clock_time_sec": round(best_run.latency_sec, 2),
        "baseline_time_sec": round(worst_lat, 2),
        "compute_cost": f"{round(best_run.peak_vram_mb or 0.0, 0)} MB VRAM",
        "dataset": f"{len(model_runs)} Real Runs",
        "features_count": f"Batch {best_run.batch_id[:16]}",
        "eval_eta": 0.00,
    }

    qualitative = []
    for r in model_runs[:3]:
        resolved_img = storage.resolve_url(r.image_url) if r.image_url else None
        qualitative.append({
            "title": f"{r.sampler_name} {r.steps} Steps",
            "subtitle": f"Seed {r.seed}",
            "tag": f"BATCH {r.batch_id[-8:]}",
            "tag_type": "optimal" if r.id == best_run.id else "gold",
            "image": resolved_img or "/benchmark-samples/ddim_50_steps.png",
            "fid": f"{round(r.fid_score, 2)}",
            "latency": f"{round(r.latency_sec, 2)}s",
            "description": (r.prompt or "Empirical diffusion benchmark run")[:120],
            "latency_index": f"{round(r.throughput_ips, 2)} img/s",
        })

    return {
        "system": system_payload,
        "kpis": kpis,
        "fid_curve": fid_curve,
        "latency_profile": latency_profile,
        "qualitative_comparison": qualitative,
        "checkpoints": [],
    }


@router.get("/history")
async def get_benchmark_history(
    model: Optional[str] = Query(None),
    sampler: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns full chronological audit trail of real user benchmark runs from PostgreSQL."""
    storage = get_storage_service()
    query = (
        select(BenchmarkRun)
        .filter(
            BenchmarkRun.batch_id != "initial_baseline_batch",
            BenchmarkRun.user_id == current_user.id,
        )
        .order_by(desc(BenchmarkRun.created_at))
    )

    if model:
        query = query.filter(BenchmarkRun.model_name == model)
    if sampler and sampler.upper() != "ALL":
        query = query.filter(BenchmarkRun.sampler_name.ilike(f"%{sampler.strip()}%"))

    rows = (await db.execute(query.limit(limit))).scalars().all()

    formatted = []
    for r in rows:
        formatted.append({
            "id": r.id,
            "batch_id": r.batch_id,
            "model": r.model_name,
            "sampler": r.sampler_name,
            "steps": r.steps,
            "generation_time": round(r.latency_sec, 2),
            "throughput": round(r.throughput_ips, 2),
            "seed": r.seed,
            "fid": round(r.fid_score, 2),
            "prompt": r.prompt,
            "image_url": storage.resolve_url(r.image_url) if r.image_url else None,
            "device": r.device_name,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {"history": formatted}


@router.get("/batch/{batch_id}")
async def get_benchmark_batch(
    batch_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Load a specific benchmark run by batch_id for the current user."""
    storage = get_storage_service()
    rows = (
        await db.execute(
            select(BenchmarkRun)
            .filter(
                BenchmarkRun.batch_id == batch_id,
                BenchmarkRun.user_id == current_user.id,
            )
            .order_by(asc(BenchmarkRun.steps))
        )
    ).scalars().all()

    if not rows:
        raise HTTPException(status_code=404, detail="Benchmark run not found")

    results = []
    steps_map: Dict[int, Dict[str, Any]] = {}
    for r in rows:
        img_url = storage.resolve_url(r.image_url) if r.image_url else None
        results.append({
            "id": r.id,
            "sampler": r.sampler_name,
            "steps": r.steps,
            "latency": round(r.latency_sec, 2),
            "fid": round(r.fid_score, 2) if r.fid_score is not None else 0.0,
            "image_url": img_url,
        })
        st = r.steps
        if st not in steps_map:
            steps_map[st] = {"steps": st}
        s_key = "ddim" if "DDIM" in r.sampler_name.upper() else "ddpm"
        steps_map[st][f"{s_key}_latency"] = round(r.latency_sec, 2)
        steps_map[st][f"{s_key}_fid"] = round(r.fid_score, 2) if r.fid_score is not None else 0.0

    first = rows[0]
    return {
        "batch_id": batch_id,
        "model_name": first.model_name,
        "prompt": first.prompt or "",
        "seed": first.seed,
        "samplers": sorted(list({r.sampler_name for r in rows})),
        "steps_list": sorted(list({r.steps for r in rows})),
        "results": results,
        "graph_data": [steps_map[s] for s in sorted(steps_map.keys())],
    }


@router.get("/export-csv")
async def export_benchmark_csv(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generates a CSV export directly from the current user's PostgreSQL benchmark records."""
    stmt = (
        select(BenchmarkRun)
        .filter(
            BenchmarkRun.batch_id != "initial_baseline_batch",
            BenchmarkRun.user_id == current_user.id,
        )
        .order_by(desc(BenchmarkRun.created_at))
    )
    runs = (await db.execute(stmt)).scalars().all()

    csv_lines = ["id,batch_id,model_name,sampler_name,steps,latency_sec,throughput_ips,fid_score,seed,device_name,created_at"]
    for r in runs:
        csv_lines.append(
            f'"{r.id}","{r.batch_id}","{r.model_name}","{r.sampler_name}",{r.steps},{r.latency_sec},{r.throughput_ips},{r.fid_score},{r.seed},"{r.device_name}","{r.created_at}"'
        )

    return PlainTextResponse(
        content="\n".join(csv_lines),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=latentcraft_empirical_benchmarks.csv"},
    )
