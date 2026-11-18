"""
samplers/__init__.py - Samplers package initialization and factory.
"""

from samplers.base import BaseSampler
from samplers.ddpm_baseline import DDPMBaselineSampler
from samplers.ddim_custom import CustomDDIMSampler
from diffusers import StableDiffusionPipeline


def get_sampler(sampler_type: str, pipe: StableDiffusionPipeline) -> BaseSampler:
    """
    Factory function to instantiate the chosen sampler strategy.
    
    Args:
        sampler_type: Either 'DDPM' or 'DDIM'
        pipe: The shared StableDiffusionPipeline instance
        
    Returns:
        BaseSampler instance
    """
    normalized = sampler_type.upper().strip()
    if "DDPM" in normalized:
        return DDPMBaselineSampler(pipe=pipe)
    elif "DDIM" in normalized:
        return CustomDDIMSampler(pipe=pipe)
    else:
        raise ValueError(
            f"Unknown sampler '{sampler_type}'. Supported choices are 'DDPM' and 'DDIM'."
        )


__all__ = [
    "BaseSampler",
    "DDPMBaselineSampler",
    "CustomDDIMSampler",
    "get_sampler",
]
