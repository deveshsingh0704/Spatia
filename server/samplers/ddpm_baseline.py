"""
samplers/ddpm_baseline.py - DDPM Baseline Sampler using Diffusers DDPMScheduler.

This module implements the DDPM baseline sampler for validation:
1. Configures Hugging Face's built-in DDPMScheduler.
2. Measures exact wall-clock generation time.
3. Preserves identical initial random latent distribution for fair comparison with DDIM.
4. Returns standardized metadata dictionary.
"""

import time
import sys
import torch
from typing import Dict, Any, Optional
from diffusers import DDPMScheduler, StableDiffusionPipeline
from samplers.base import BaseSampler
from config import (
    DEFAULT_STEPS,
    DEFAULT_GUIDANCE_SCALE,
    DEFAULT_HEIGHT,
    DEFAULT_WIDTH,
    DEFAULT_SEED,
    DEFAULT_NEGATIVE_PROMPT,
)


class DDPMBaselineSampler(BaseSampler):
    """
    DDPM Baseline Sampler.
    
    Uses Diffusers' standard DDPMScheduler to run the Markovian diffusion process.
    Because DDPM relies on small step sizes with stochastic Gaussian noise injection,
    it represents the classic baseline (Ho et al., 2020).
    """

    def __init__(
        self,
        pipe: StableDiffusionPipeline,
        device: str = None,
        dtype: torch.dtype = None,
    ):
        super().__init__(
            pipe=pipe,
            device=device or pipe.device.type,
            dtype=dtype or pipe.unet.dtype,
        )
        self.sampler_name = "DDPM (Diffusers Baseline)"
        
        # Initialize and attach the DDPMScheduler from the existing scheduler config
        self.scheduler = DDPMScheduler.from_config(self.pipe.scheduler.config)

    def sample(
        self,
        prompt: str,
        num_inference_steps: int = DEFAULT_STEPS,
        guidance_scale: float = DEFAULT_GUIDANCE_SCALE,
        seed: int = DEFAULT_SEED,
        height: int = DEFAULT_HEIGHT,
        width: int = DEFAULT_WIDTH,
        negative_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes DDPM sampling using the pipeline.
        
        Measures total inference time and formats metadata for comparison.
        """
        # Set pipeline scheduler to DDPMScheduler
        self.pipe.scheduler = self.scheduler

        # Create generator for reproducibility
        generator = self.get_generator(seed)

        # Start high-precision timer
        start_time = time.perf_counter()

        try:
            with torch.inference_mode():
                output = self.pipe(
                    prompt=prompt,
                    negative_prompt=negative_prompt or DEFAULT_NEGATIVE_PROMPT,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    height=height,
                    width=width,
                    generator=generator,
                    output_type="pil",
                )
                image = output.images[0]

        except torch.cuda.OutOfMemoryError as oom:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            print(f"[DDPMBaselineSampler] CUDA OutOfMemory encountered: {oom}", file=sys.stderr)
            raise oom

        generation_time = time.perf_counter() - start_time

        return {
            "image": image,
            "sampler_name": self.sampler_name,
            "num_steps": num_inference_steps,
            "generation_time": round(generation_time, 3),
            "seed": seed,
            "model_name": self.model_name,
            "prompt": prompt,
            "guidance_scale": guidance_scale,
            "height": height,
            "width": width,
        }
