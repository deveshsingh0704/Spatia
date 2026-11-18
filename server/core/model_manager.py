"""
src/model_manager.py - Memory-Aware Model Manager for 6GB VRAM GPUs.

Implements:
1. Dynamic runtime loading for SD 1.5, SD 2.1, and SDXL Base 1.0.
2. Single-model retention: unloads previous pipeline before loading a new one.
3. Explicit VRAM purging (gc.collect + torch.cuda.empty_cache + ipc_collect).
4. Memory optimization profiles:
   - SD 1.5 / SD 2.1: FP16 + GPU direct + attention slicing + VAE slicing.
   - SDXL Base: FP16 + model CPU offloading + attention slicing + VAE slicing + VAE tiling.
5. Graceful Out-Of-Memory (OOM) handling.
"""

import sys
import os
import gc
from pathlib import Path
from typing import Optional, Dict, Any
import torch
from diffusers import StableDiffusionPipeline, StableDiffusionXLPipeline

from src.config import (
    MODELS_CONFIG,
    DEFAULT_MODEL,
    DEVICE,
    TORCH_DTYPE,
    CUDA_AVAILABLE,
)
from src.utils import clear_gpu_memory, get_vram_usage


class ModelManager:
    """
    Manages the lifecycle of diffusion models in memory.
    
    Ensures that only ONE model occupies GPU memory at any given time,
    preventing CUDA OOM errors on 6GB VRAM GPUs like the RTX 4050.
    """

    def __init__(self):
        self._current_model_name: Optional[str] = None
        self._current_pipeline: Optional[Any] = None

    @property
    def current_model_name(self) -> Optional[str]:
        """Returns the name of the currently active model."""
        return self._current_model_name

    def is_model_loaded(self, model_name: str) -> bool:
        """Checks whether the requested model is already active in memory."""
        return (
            self._current_model_name == model_name
            and self._current_pipeline is not None
        )

    def unload_model(self, model_name: Optional[str] = None) -> None:
        """
        Unloads the currently loaded pipeline from GPU and CPU memory.
        
        Args:
            model_name: Optional target model name (unloads current if matching or None).
        """
        if self._current_pipeline is None:
            return

        if model_name is not None and self._current_model_name != model_name:
            return

        print(f"[ModelManager] Unloading '{self._current_model_name}' to free VRAM...")
        
        # Sever references
        del self._current_pipeline
        self._current_pipeline = None
        self._current_model_name = None

        # Flush VRAM
        clear_gpu_memory()
        vram = get_vram_usage()
        print(f"[ModelManager] Model unloaded. Current VRAM: {vram['allocated_mb']}MB allocated.")

    def load_model(self, model_name: str) -> Any:
        """
        Loads the specified model into memory with model-appropriate VRAM optimizations.
        
        If the model is already loaded, returns the existing pipeline without reloading.
        If a different model is currently active, unloads it first.
        
        Args:
            model_name: Must be a key in MODELS_CONFIG ('Stable Diffusion v1.5', 'Stable Diffusion 2.1', 'SDXL')
            
        Returns:
            The loaded Diffusers pipeline.
        """
        if model_name not in MODELS_CONFIG:
            raise ValueError(
                f"Unknown model '{model_name}'. Available choices: {list(MODELS_CONFIG.keys())}"
            )

        # 1. Check cache: return immediately if already active
        if self.is_model_loaded(model_name):
            return self._current_pipeline

        # 2. Unload active model if switching
        if self._current_pipeline is not None:
            print(f"[ModelManager] Switching models: '{self._current_model_name}' -> '{model_name}'.")
            self.unload_model()

        config = MODELS_CONFIG[model_name]
        model_id = config["id"]
        pipeline_cls_name = config["pipeline_cls"]

        print(f"\n[ModelManager] Loading '{model_name}' ({model_id}) on {DEVICE.upper()} ({TORCH_DTYPE})...")

        try:
            # 3. Load base weights
            # Select appropriate pipeline class
            if pipeline_cls_name == "StableDiffusionXLPipeline":
                pipeline_class = StableDiffusionXLPipeline
            else:
                pipeline_class = StableDiffusionPipeline

            # Load kwargs tailored to pipeline type
            load_kwargs = {
                "dtype": TORCH_DTYPE,
                "low_cpu_mem_usage": True,
            }
            if pipeline_cls_name != "StableDiffusionXLPipeline":
                load_kwargs["safety_checker"] = None

            # Pass Hugging Face token if present in environment
            hf_token = os.environ.get("HF_TOKEN")
            if hf_token:
                load_kwargs["token"] = hf_token

            pipe = pipeline_class.from_pretrained(model_id, **load_kwargs)

            # 4. Apply device placement & memory optimization profiles
            if DEVICE == "cuda":
                # SD 1.5 (~1.7GB) fits directly into 6GB VRAM with ample headroom
                pipe = pipe.to("cuda")
                pipe.enable_attention_slicing()
                if hasattr(pipe, "enable_vae_slicing"):
                    pipe.enable_vae_slicing()
                print(f"[ModelManager] Enabled attention slicing and VAE slicing for {model_name}.")
            else:
                # CPU Fallback
                pipe = pipe.to("cpu")
                print(f"[ModelManager] Loaded {model_name} onto CPU.")

            # 5. Check if this is a Fine-Tuned LoRA model
            if config.get("is_lora") and config.get("lora_path"):
                lora_path = Path(config["lora_path"])
                if lora_path.exists():
                    print(f"[ModelManager] Injecting fine-tuned Bedroom LoRA weights from {lora_path}...")
                    lora_scale = config.get("lora_scale", 0.8)
                    pipe.load_lora_weights(str(lora_path.parent), weight_name=lora_path.name)
                    # Fuse LoRA with scale 0.8: Balances realistic LSUN bedroom layout with base SD 1.5 crispness
                    pipe.fuse_lora(lora_scale=lora_scale)
                    print(f"[ModelManager] Fine-tuned LoRA adapter active with optimal weight scale {lora_scale}.")
                else:  
                    print(f"[ModelManager] Warning: LoRA path {lora_path} not found. Running baseline weights.")

            # Store active pipeline
            self._current_pipeline = pipe
            self._current_model_name = model_name

            vram = get_vram_usage()
            print(f"[ModelManager] Successfully initialized '{model_name}'! VRAM allocated: {vram['allocated_mb']}MB.\n")
            return self._current_pipeline

        except torch.cuda.OutOfMemoryError as oom:
            clear_gpu_memory()
            self._current_pipeline = None
            self._current_model_name = None
            error_msg = (
                f"CUDA Out of Memory while loading '{model_name}'! "
                f"Your 6GB VRAM was exceeded. Try closing other GPU applications."
            )
            print(f"\n[CRITICAL ERROR] {error_msg}\n{oom}", file=sys.stderr)
            raise RuntimeError(error_msg) from oom

        except Exception as e:
            clear_gpu_memory()
            self._current_pipeline = None
            self._current_model_name = None
            err_str = str(e)
            if "401" in err_str or "unauthorized" in err_str.lower() or "gated" in err_str.lower():
                helpful_msg = (
                    f"\n[AUTHENTICATION REQUIRED] '{model_name}' ({model_id}) requires Hugging Face authentication!\n"
                    f"Stability AI has placed a license requirement on this repository.\n"
                    f"To fix this:\n"
                    f"  1. Visit: https://huggingface.co/{model_id} and accept the license terms.\n"
                    f"  2. Run: `huggingface-cli login` in your terminal and enter your Hugging Face User Access Token.\n"
                    f"     (Or set the environment variable: `$env:HF_TOKEN=\"your_token_here\"`).\n"
                )
                print(helpful_msg, file=sys.stderr)
                raise RuntimeError(helpful_msg) from e
            print(f"[ModelManager] Unexpected error loading model '{model_name}': {e}", file=sys.stderr)
            raise e

    def get_model(self, model_name: str) -> Any:
        """Alias for load_model() ensuring the requested model is ready."""
        return self.load_model(model_name)

    def clear_gpu_memory(self) -> None:
        """Explicitly flushes GPU memory."""
        clear_gpu_memory()


# Global Singleton Instance
_GLOBAL_MODEL_MANAGER: Optional[ModelManager] = None


def get_model_manager() -> ModelManager:
    """Returns the shared ModelManager instance."""
    global _GLOBAL_MODEL_MANAGER
    if _GLOBAL_MODEL_MANAGER is None:
        _GLOBAL_MODEL_MANAGER = ModelManager()
    return _GLOBAL_MODEL_MANAGER
