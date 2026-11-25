"""
src/config.py - Central Configuration for Multi-Model Diffusion Comparison Prototype.

Handles:
1. Hardware detection (CUDA GPU vs. CPU, VRAM detection).
2. Model registry supporting SD 1.5, SD 2.1, and SDXL with memory-safe profiles.
3. Model-specific resolution configurations.
4. Benchmark parameters and standardized file paths.
"""

import os
from pathlib import Path
from typing import Dict, Any, List, Tuple
import torch

# Base project paths
BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUTS_DIR = BASE_DIR / "outputs"
GENERATED_DIR = OUTPUTS_DIR / "generated"
EXPERIMENTS_DIR = OUTPUTS_DIR / "experiments"
EXPERIMENT_CSV = EXPERIMENTS_DIR / "experiment_results.csv"

# Model-specific benchmark directories
SD15_EXP_DIR = EXPERIMENTS_DIR / "SD15"
SD15_FINETUNED_EXP_DIR = EXPERIMENTS_DIR / "SD15_FineTuned"

# Ensure all output directories exist
for directory in [OUTPUTS_DIR, GENERATED_DIR, EXPERIMENTS_DIR, SD15_EXP_DIR, SD15_FINETUNED_EXP_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Path to our custom fine-tuned bedroom LoRA weights
LORA_WEIGHTS_PATH = OUTPUTS_DIR / "sd15_bedroom_lora" / "final_bedroom_lora.safetensors"

# Hardware Detection and Precision Setup
# RTX 4050 Laptop GPU has 6GB VRAM.
# On CUDA GPU: float16 is essential for fitting models in 6GB VRAM.
# On CPU: float32 is used as a fallback for numerical stability.
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

# Supported Model Registry
# Configured strictly for SD1.5 Base and SD1.5 Fine-Tuned (LSUN Bedroom LoRA)
MODELS_CONFIG: Dict[str, Dict[str, Any]] = {
    "Stable Diffusion v1.5": {
        "id": "runwayml/stable-diffusion-v1-5",
        "short_name": "SD15",
        "pipeline_cls": "StableDiffusionPipeline",
        "default_resolution": (512, 512),
        "resolutions": [(512, 512), (768, 512), (512, 768), (768, 768)],
        "vram_profile": "light",
        "exp_dir": SD15_EXP_DIR,
        "is_lora": False,
        "description": "Standard base SD1.5 model (860M UNet parameters, fp16). Fast & low VRAM (~2.0-2.5GB).",
    },
    "Stable Diffusion v1.5 (Fine-Tuned)": {
        "id": "runwayml/stable-diffusion-v1-5",
        "short_name": "SD15_FineTuned",
        "pipeline_cls": "StableDiffusionPipeline",
        "default_resolution": (512, 512),
        "resolutions": [(512, 512), (768, 512), (512, 768), (768, 768)],
        "vram_profile": "light",
        "exp_dir": SD15_FINETUNED_EXP_DIR,
        "is_lora": True,
        "lora_path": LORA_WEIGHTS_PATH,
        "description": "SD1.5 fine-tuned on LSUN Bedroom Dataset with custom BLIP captions. Realistic interior layouts & lighting.",
    },
}

DEFAULT_MODEL = "Stable Diffusion v1.5 (Fine-Tuned)"

# Sampler Choices
SUPPORTED_SAMPLERS = ["DDIM", "DDPM"]
DEFAULT_SAMPLER = "DDIM"

# Generation Defaults
DEFAULT_PROMPT = (
    "A photorealistic architectural interior photograph of a modern luxury master bedroom, "
    "king size platform bed with plush linen duvet and textured throw pillows, "
    "light oak herringbone hardwood floor, floor-to-ceiling panoramic glass windows with sheer curtains, "
    "soft morning natural sunlight, subtle warm recessed ambient ceiling lighting, "
    "marble bedside tables with designer brass lamps, clean architectural symmetry, "
    "interior design magazine photography, 8k resolution, highly detailed, photorealistic, cinematic composition"
)
DEFAULT_NEGATIVE_PROMPT = (
    "blurry, grain, noise, low quality, worst quality, normal quality, artifacts, "
    "jpeg compression, deformed, distorted, bad architecture, weird perspective, "
    "unnatural light, overexposed, oversaturated, cartoon, 3d render, dollhouse, "
    "drawing, painting, bad proportions, bad anatomy, duplicate, cropped, out of frame, "
    "signature, watermark, username, text"
)
DEFAULT_STEPS = 20
DEFAULT_GUIDANCE_SCALE = 7.5
DEFAULT_SEED = 42

# Benchmark Specifications (Fixed per project requirements)
BENCHMARK_PROMPT = (
    "A modern minimalist bedroom interior with wooden flooring, "
    "warm ambient lighting, large windows, elegant furniture, "
    "realistic architectural visualization, high detail"
)
BENCHMARK_MODELS = ["Stable Diffusion v1.5", "Stable Diffusion v1.5 (Fine-Tuned)"]
BENCHMARK_SAMPLERS = ["DDPM", "DDIM"]
BENCHMARK_STEPS = [10, 20, 30]
BENCHMARK_SEED = 42


def get_hardware_info() -> Dict[str, Any]:
    """Returns runtime hardware and VRAM allocation information."""
    info = {
        "device": DEVICE,
        "device_name": DEVICE_NAME,
        "dtype": str(TORCH_DTYPE),
        "cuda_available": CUDA_AVAILABLE,
        "vram_total_gb": f"{TOTAL_VRAM_GB:.2f} GB" if CUDA_AVAILABLE else "N/A",
    }
    if CUDA_AVAILABLE:
        allocated = torch.cuda.memory_allocated(0) / (1024**3)
        reserved = torch.cuda.memory_reserved(0) / (1024**3)
        info["vram_allocated_gb"] = f"{allocated:.2f} GB"
        info["vram_reserved_gb"] = f"{reserved:.2f} GB"
    return info
