"""
src/sampler_manager.py - Modular Sampler Architecture for Multi-Model Diffusion.

Provides:
1. BaseSampler abstract class defining common sampling contracts.
2. DDPMSampler: Markovian stochastic diffusion using Diffusers DDPMScheduler.
3. DDIMSampler: Deterministic ODE sampling using Diffusers DDIMScheduler.
4. SamplerManager: Factory validating model-sampler compatibility.
"""

from abc import ABC, abstractmethod
import sys
import time
from typing import Dict, Any, Optional
import torch
from PIL import Image
from diffusers import DDPMScheduler, DDIMScheduler

from src.config import (
    DEFAULT_STEPS,
    DEFAULT_GUIDANCE_SCALE,
    DEFAULT_SEED,
    DEFAULT_NEGATIVE_PROMPT,
    SUPPORTED_SAMPLERS,
)
from src.utils import synchronized_timer, reset_peak_vram, get_vram_usage


class BaseSampler(ABC):
    """
    Abstract Base Class for all diffusion samplers.
    
    Subclasses must implement `sample()` to run the denoising schedule.
    """

    def __init__(self, pipe: Any, sampler_name: str = "BaseSampler"):
        self.pipe = pipe
        self.sampler_name = sampler_name

    def get_generator(self, seed: Optional[int]) -> torch.Generator:
        """Creates a device-safe random generator with a fixed seed."""
        # Note: In diffusers, when using model CPU offload or CUDA, generator on CPU or CUDA is accepted.
        # Generating on CPU ensures exact cross-device reproducibility.
        generator = torch.Generator(device="cpu")
        if seed is not None:
            generator.manual_seed(seed)
        return generator

    @abstractmethod
    def sample(
        self,
        prompt: str,
        num_inference_steps: int = DEFAULT_STEPS,
        guidance_scale: float = DEFAULT_GUIDANCE_SCALE,
        seed: int = DEFAULT_SEED,
        height: int = 512,
        width: int = 512,
        negative_prompt: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Executes the denoising schedule and returns generated image and metadata.
        """
        pass


class DDPMSampler(BaseSampler):
    """
    DDPM Sampler (Ho et al., 2020).
    
    Uses Diffusers' DDPMScheduler to run the discrete Markovian stochastic chain.
    Requires larger step counts (e.g. 50-100) for high quality; degrades at low steps.
    """

    def __init__(self, pipe: Any):
        super().__init__(pipe=pipe, sampler_name="DDPM")
        # Instantiate scheduler directly from the active pipeline's configuration
        # This preserves model-specific settings (e.g. prediction_type="v_prediction" on SD 2.1)
        self.scheduler = DDPMScheduler.from_config(self.pipe.scheduler.config)

    def sample(
        self,
        prompt: str,
        num_inference_steps: int = DEFAULT_STEPS,
        guidance_scale: float = DEFAULT_GUIDANCE_SCALE,
        seed: int = DEFAULT_SEED,
        height: int = 512,
        width: int = 512,
        negative_prompt: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        self.pipe.scheduler = self.scheduler
        generator = self.get_generator(seed)

        reset_peak_vram()
        with synchronized_timer() as timer:
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

        vram = get_vram_usage()
        return {
            "image": output.images[0],
            "sampler_name": self.sampler_name,
            "num_steps": num_inference_steps,
            "generation_time": round(timer["duration"], 3),
            "seed": seed,
            "prompt": prompt,
            "guidance_scale": guidance_scale,
            "height": height,
            "width": width,
            "peak_vram_mb": vram["peak_mb"],
            "allocated_vram_mb": vram["allocated_mb"],
        }


class DDIMSampler(BaseSampler):
    """
    DDIM Sampler (Song et al., 2020).
    
    Uses Diffusers' DDIMScheduler (deterministic non-Markovian ODE trajectory).
    Maintains crisp structure at low steps (10-30), ideal for rapid prototyping.
    """

    def __init__(self, pipe: Any):
        super().__init__(pipe=pipe, sampler_name="DDIM")
        # Instantiate scheduler from pipeline config to respect prediction_type and beta schedules
        self.scheduler = DDIMScheduler.from_config(self.pipe.scheduler.config)

    def sample(
        self,
        prompt: str,
        num_inference_steps: int = DEFAULT_STEPS,
        guidance_scale: float = DEFAULT_GUIDANCE_SCALE,
        seed: int = DEFAULT_SEED,
        height: int = 512,
        width: int = 512,
        negative_prompt: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        self.pipe.scheduler = self.scheduler
        generator = self.get_generator(seed)

        reset_peak_vram()
        with synchronized_timer() as timer:
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

        vram = get_vram_usage()
        return {
            "image": output.images[0],
            "sampler_name": self.sampler_name,
            "num_steps": num_inference_steps,
            "generation_time": round(timer["duration"], 3),
            "seed": seed,
            "prompt": prompt,
            "guidance_scale": guidance_scale,
            "height": height,
            "width": width,
            "peak_vram_mb": vram["peak_mb"],
            "allocated_vram_mb": vram["allocated_mb"],
        }


class SamplerManager:
    """
    Factory for creating and validating model-compatible samplers.
    """

    @staticmethod
    def get_sampler(sampler_name: str, pipe: Any, model_name: Optional[str] = None) -> BaseSampler:
        """
        Returns a configured sampler instance for the target pipeline.
        
        Args:
            sampler_name: 'DDPM' or 'DDIM'
            pipe: Active Hugging Face diffusion pipeline
            model_name: Optional model identifier for compatibility checks
            
        Returns:
            BaseSampler instance
        """
        normalized = sampler_name.upper().strip()
        if "DDPM" in normalized:
            return DDPMSampler(pipe=pipe)
        elif "DDIM" in normalized:
            return DDIMSampler(pipe=pipe)
        else:
            raise ValueError(
                f"Unsupported sampler '{sampler_name}'. Supported samplers: {SUPPORTED_SAMPLERS}"
            )
