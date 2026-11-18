"""
src/generator_service.py - Generation Service Orchestrating Inference and Metrics.

Provides:
1. High-level generate_mockup() API called by Gradio and tests.
2. Parameter validation and model-specific resolution enforcement.
3. Synchronized timing and peak VRAM measurement.
4. Saving output image to outputs/generated/.
5. Formatting detailed metadata card for UI display.
"""

import time
import sys
from pathlib import Path
from typing import Tuple, Optional, Dict, Any
from PIL import Image

from src.config import (
    MODELS_CONFIG,
    GENERATED_DIR,
    DEVICE_NAME,
    TORCH_DTYPE,
    DEFAULT_STEPS,
    DEFAULT_GUIDANCE_SCALE,
    DEFAULT_SEED,
)
from src.model_manager import get_model_manager
from src.sampler_manager import SamplerManager
from src.utils import get_vram_usage, clear_gpu_memory


class GeneratorService:
    """
    Coordinates model loading, sampler dispatch, image saving, and metadata formatting.
    """

    def __init__(self):
        self.model_manager = get_model_manager()

    def generate(
        self,
        prompt: str,
        negative_prompt: Optional[str],
        model_name: str,
        sampler_name: str,
        steps: int,
        guidance_scale: float,
        seed: int,
        resolution: Tuple[int, int] = (512, 512),
    ) -> Tuple[Optional[Image.Image], str]:
        """
        Executes a single text-to-image generation.
        
        Returns:
            (PIL.Image.Image or None, metadata_markdown_str)
        """
        if not prompt or not prompt.strip():
            return None, "⚠️ **Error:** Prompt cannot be empty."

        width, height = resolution

        # Model validation
        if model_name not in MODELS_CONFIG:
            return None, f"⚠️ **Error:** Unknown model '{model_name}'."

        model_cfg = MODELS_CONFIG[model_name]
        short_name = model_cfg["short_name"]

        # Ensure resolution is safe for the chosen model
        if resolution not in model_cfg["resolutions"]:
            print(f"[GeneratorService] Warning: {resolution} not in tested resolutions {model_cfg['resolutions']} for {model_name}. Proceeding with caution.")

        try:
            # 1. Fetch/load pipeline (auto-unloads previous model if different)
            pipe = self.model_manager.get_model(model_name)

            # 2. Fetch compatible sampler
            sampler = SamplerManager.get_sampler(sampler_name, pipe, model_name)

            # 3. Execute inference
            result = sampler.sample(
                prompt=prompt.strip(),
                negative_prompt=negative_prompt.strip() if negative_prompt else None,
                num_inference_steps=int(steps),
                guidance_scale=float(guidance_scale),
                seed=int(seed),
                width=width,
                height=height,
            )

            # 4. Save image to outputs/generated/
            timestamp = int(time.time())
            clean_sampler = sampler_name.replace(" ", "_")
            filename = f"{short_name}_{clean_sampler}_s{steps}_seed{seed}_{timestamp}.png"
            filepath = GENERATED_DIR / filename
            result["image"].save(filepath)

            # 5. Format user-facing metadata card
            vram_stats = get_vram_usage()
            peak_vram_str = f"{result.get('peak_vram_mb', vram_stats['peak_mb']):.0f} MB"
            alloc_vram_str = f"{vram_stats['allocated_mb']:.0f} MB"

            metadata_md = f"""
### Generation Metadata
- **Model:** `{model_name}` (`{short_name}`)
- **Sampler:** `{result['sampler_name']}`
- **Resolution:** `{width} × {height}`
- **Sampling Steps:** `{result['num_steps']}`
- **Generation Time:** `{result['generation_time']:.3f}s`
- **Peak VRAM:** `{peak_vram_str}` *(Allocated: {alloc_vram_str})*
- **Random Seed:** `{result['seed']}`
- **Guidance Scale:** `{result['guidance_scale']}`
- **Hardware:** `{DEVICE_NAME} ({TORCH_DTYPE})`
- **Saved File:** `{filepath.name}`
"""
            return result["image"], metadata_md

        except RuntimeError as rt_err:
            clear_gpu_memory()
            error_str = str(rt_err)
            return None, f"❌ **Execution Error:** {error_str}"

        except Exception as e:
            clear_gpu_memory()
            error_msg = f"❌ **Generation Failed:** {str(e)}"
            if "out of memory" in str(e).lower():
                error_msg += (
                    "\n\n> [!CAUTION]\n"
                    "> **CUDA Out of Memory!**\n"
                    "> Your 6GB VRAM limit was reached. Recommendations:\n"
                    "> 1. Ensure resolution is 512x512.\n"
                    "> 2. For SDXL, model CPU offloading is automatically used, but other running GPU programs (browsers, games) may reduce available VRAM.\n"
                    "> 3. Close other GPU applications and retry."
                )
            return None, error_msg


# Shared singleton instance
_GLOBAL_GENERATOR: Optional[GeneratorService] = None


def get_generator_service() -> GeneratorService:
    global _GLOBAL_GENERATOR
    if _GLOBAL_GENERATOR is None:
        _GLOBAL_GENERATOR = GeneratorService()
    return _GLOBAL_GENERATOR
