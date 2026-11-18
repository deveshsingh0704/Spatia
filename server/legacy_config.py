"""
config.py - Central Configuration for Fast Design-Mockup Generator.

This file handles:
1. Automatic hardware detection (CUDA GPU vs. CPU).
2. Data type selection (float16 for GPU memory savings, float32 for CPU stability).
3. Default model parameters (resolution, guidance scale, steps).
4. Project filesystem directories for saving images and experiment CSVs.
"""

import os
from pathlib import Path
import torch

# Base directories
BASE_DIR = Path(__file__).resolve().parent
OUTPUTS_DIR = BASE_DIR / "outputs"
MOCKUPS_DIR = OUTPUTS_DIR / "mockups"
EXPERIMENTS_DIR = OUTPUTS_DIR / "experiments"
EXPERIMENT_CSV = EXPERIMENTS_DIR / "experiment_results.csv"

# Ensure output directories exist
MOCKUPS_DIR.mkdir(parents=True, exist_ok=True)
EXPERIMENTS_DIR.mkdir(parents=True, exist_ok=True)

# Pretrained Model
MODEL_ID = "runwayml/stable-diffusion-v1-5"

# Hardware Detection and Precision Setup
# On CUDA GPU: float16 is ~2x faster and uses half the VRAM (vital for 6GB GPUs).
# On CPU: float16 is often not supported natively or slower, so we use float32.
CUDA_AVAILABLE = torch.cuda.is_available()

if CUDA_AVAILABLE:
    DEVICE = "cuda"
    TORCH_DTYPE = torch.float16
    DEVICE_NAME = torch.cuda.get_device_name(0)
    TOTAL_VRAM_GB = torch.cuda.get_device_properties(0).total_memory / (1024**3)
else:
    DEVICE = "cpu"
    TORCH_DTYPE = torch.float32
    DEVICE_NAME = "CPU"
    TOTAL_VRAM_GB = 0.0

# Generation Defaults

DEFAULT_PROMPT = (
    "A modern minimalist master bedroom interior with light oak wooden flooring, warm ambient recessed lighting, large floor-to-ceiling panoramic windows overlooking a city skyline, king-size bed with crisp linen, elegant designer nightstands, realistic architectural visualization, 8k resolution"
)
DEFAULT_NEGATIVE_PROMPT = (
    "ugly, blurry, distorted, low quality, pixelated, bad typography, watermark"
)
DEFAULT_STEPS = 20
DEFAULT_GUIDANCE_SCALE = 7.5
DEFAULT_HEIGHT = 512
DEFAULT_WIDTH = 512
DEFAULT_SEED = 42

# Experiment Mode Settings (per requirements)
EXPERIMENT_SAMPLERS = ["DDPM", "DDIM"]
EXPERIMENT_STEPS = [5, 10, 15, 20, 30, 50]


def get_hardware_info() -> dict:
    """Returns a friendly dictionary describing current compute hardware."""
    info = {
        "device": DEVICE,
        "device_name": DEVICE_NAME,
        "dtype": str(TORCH_DTYPE),
        "cuda_available": CUDA_AVAILABLE,
    }
    if CUDA_AVAILABLE:
        info["vram_total_gb"] = f"{TOTAL_VRAM_GB:.2f} GB"
        allocated = torch.cuda.memory_allocated(0) / (1024**3)
        info["vram_allocated_gb"] = f"{allocated:.2f} GB"
    return info


if __name__ == "__main__":
    print("--- Fast Design-Mockup Generator Configuration ---")
    for key, val in get_hardware_info().items():
        print(f"  {key}: {val}")
    print(f"  Model: {MODEL_ID}")
    print(f"  Outputs directory: {OUTPUTS_DIR}")
