"""
pipeline_loader.py - Stable Diffusion v1.5 Model Loader with Memory Optimizations.

This module is responsible for:
1. Downloading and caching the Stable Diffusion v1.5 weights (runwayml/stable-diffusion-v1-5).
2. Applying precision rules (float16 on CUDA, float32 on CPU).
3. Applying memory optimizations (attention slicing) so it fits comfortably in low-VRAM GPUs.
4. Handling Out-Of-Memory (OOM) errors gracefully with helpful diagnostic messages.
5. Providing direct access to the pipeline's submodules (UNet, VAE, Text Encoder, Tokenizer).
"""

import sys
import torch
from diffusers import StableDiffusionPipeline
from config import MODEL_ID, DEVICE, TORCH_DTYPE, CUDA_AVAILABLE

# Global cache for the loaded pipeline so we do not reload the multi-gigabyte model on every inference
_GLOBAL_PIPELINE = None


def load_pipeline(device: str = DEVICE, torch_dtype: torch.dtype = TORCH_DTYPE) -> StableDiffusionPipeline:
    """
    Loads and configures the StableDiffusionPipeline.
    
    Uses singleton pattern to avoid reloading heavy weights into memory multiple times.
    Enables attention slicing on CUDA to prevent Out-Of-Memory (OOM) errors on 6GB/8GB GPUs.
    """
    global _GLOBAL_PIPELINE
    if _GLOBAL_PIPELINE is not None:
        return _GLOBAL_PIPELINE

    print(f"[PipelineLoader] Loading '{MODEL_ID}' on device '{device}' with dtype '{torch_dtype}'...")

    try:
        # We load the pipeline without the safety checker to save ~1GB of VRAM and prevent false alarms on UI graphics.
        # Use low_cpu_mem_usage=True to avoid memory spikes while loading weights from disk.
        pipe = StableDiffusionPipeline.from_pretrained(
            MODEL_ID,
            dtype=torch_dtype,
            safety_checker=None,
            low_cpu_mem_usage=True,
        )

        # Move pipeline to the target device (cuda or cpu)
        pipe = pipe.to(device)

        # Optimization: Attention slicing computes self-attention in slices, dramatically reducing
        # peak VRAM from ~7-8 GB down to ~3-4 GB with virtually zero speed loss.
        if device == "cuda":
            pipe.enable_attention_slicing()
            print("[PipelineLoader] Enabled attention slicing for CUDA memory efficiency.")

        _GLOBAL_PIPELINE = pipe
        print(f"[PipelineLoader] Successfully loaded '{MODEL_ID}' onto {device.upper()}!")
        return _GLOBAL_PIPELINE

    except torch.cuda.OutOfMemoryError as oom_err:
        print("\n[CRITICAL ERROR] CUDA Out of Memory while loading Stable Diffusion!", file=sys.stderr)
        print("Suggestions to resolve this:", file=sys.stderr)
        print("  1. Close other applications using the GPU (browsers, games, other python scripts).", file=sys.stderr)
        print("  2. PyTorch memory cache can be flushed with torch.cuda.empty_cache().", file=sys.stderr)
        print("  3. Run on CPU mode by setting DEVICE = 'cpu' in config.py.", file=sys.stderr)
        torch.cuda.empty_cache()
        raise oom_err

    except Exception as e:
        print(f"[PipelineLoader] Error loading model: {e}", file=sys.stderr)
        raise e


def get_pipeline_components(pipe: StableDiffusionPipeline = None):
    """
    Convenience function to unpack the pipeline's submodules for custom sampling loops.
    
    Returns:
        tokenizer: CLIPTokenizer
        text_encoder: CLIPTextModel
        unet: UNet2DConditionModel
        vae: AutoencoderKL
        scheduler: Scheduler (DDPM / DDIM)
    """
    if pipe is None:
        pipe = load_pipeline()
    return (
        pipe.tokenizer,
        pipe.text_encoder,
        pipe.unet,
        pipe.vae,
        pipe.scheduler,
    )


def clear_cuda_cache():
    """Utility to safely free cached CUDA memory blocks."""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()
        print("[PipelineLoader] Cleared CUDA cache.")


if __name__ == "__main__":
    print("Testing pipeline loader module...")
    p = load_pipeline()
    print("Loaded pipeline successfully:", type(p))
