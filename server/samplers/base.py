"""
samplers/base.py - Base Abstract Class for Samplers in Fast Design-Mockup Generator.

Defines the contract and shared helper methods for all sampling strategies:
1. Deterministic seeding and generator creation.
2. Text prompt tokenization and embedding generation (conditional + unconditional for CFG).
3. Latent space decoding through the VAE Decoder into PIL RGB images.
4. Timing execution and reporting standard metadata.
"""

from abc import ABC, abstractmethod
import time
import sys
from typing import Dict, Any, Optional
import torch
from PIL import Image
from diffusers import StableDiffusionPipeline
from config import (
    MODEL_ID,
    DEVICE,
    TORCH_DTYPE,
    DEFAULT_STEPS,
    DEFAULT_GUIDANCE_SCALE,
    DEFAULT_HEIGHT,
    DEFAULT_WIDTH,
    DEFAULT_SEED,
    DEFAULT_NEGATIVE_PROMPT,
)


class BaseSampler(ABC):
    """
    Abstract Base Class for all diffusion samplers.
    
    Subclasses must implement the `sample()` method.
    Provides standard latent encoding/decoding and execution timing.
    """

    def __init__(
        self,
        pipe: StableDiffusionPipeline,
        device: str = DEVICE,
        dtype: torch.dtype = TORCH_DTYPE,
    ):
        self.pipe = pipe
        self.device = device
        self.dtype = dtype
        self.model_name = MODEL_ID
        self.sampler_name = "BaseSampler"

    def get_generator(self, seed: Optional[int]) -> torch.Generator:
        """Creates a device-compatible PyTorch random generator with a fixed seed."""
        gen_device = "cpu" if self.device == "cpu" else "cuda"
        generator = torch.Generator(device=gen_device)
        if seed is not None:
            generator.manual_seed(seed)
        return generator

    def get_text_embeddings(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        batch_size: int = 1,
    ) -> torch.Tensor:
        """
        Encodes the positive prompt and negative (unconditional) prompt into text embeddings.
        
        Concatenates them into shape (2 * batch_size, sequence_length, embedding_dim)
        so that UNet can process both unconditional and conditional passes in a single batch.
        """
        tokenizer = self.pipe.tokenizer
        text_encoder = self.pipe.text_encoder

        # 1. Tokenize and encode the conditional prompt
        text_inputs = tokenizer(
            prompt,
            padding="max_length",
            max_length=tokenizer.model_max_length,
            truncation=True,
            return_tensors="pt",
        )
        text_input_ids = text_inputs.input_ids.to(self.device)
        prompt_embeds = text_encoder(text_input_ids)[0]
        prompt_embeds = prompt_embeds.to(dtype=self.dtype, device=self.device)

        # 2. Tokenize and encode the unconditional (negative) prompt
        if negative_prompt is None:
            negative_prompt = DEFAULT_NEGATIVE_PROMPT

        uncond_inputs = tokenizer(
            negative_prompt,
            padding="max_length",
            max_length=tokenizer.model_max_length,
            truncation=True,
            return_tensors="pt",
        )
        uncond_input_ids = uncond_inputs.input_ids.to(self.device)
        uncond_embeds = text_encoder(uncond_input_ids)[0]
        uncond_embeds = uncond_embeds.to(dtype=self.dtype, device=self.device)

        # 3. Concatenate for Classifier-Free Guidance (CFG): [unconditional, conditional]
        text_embeddings = torch.cat([uncond_embeds, prompt_embeds])
        return text_embeddings

    def decode_latents(self, latents: torch.Tensor) -> Image.Image:
        """
        Decodes the clean 4-channel latent tensor (1, 4, 64, 64) back to
        a standard 3-channel RGB PIL Image (512, 512) using the VAE Decoder.
        """
        vae = self.pipe.vae
        
        # Scale factor is required because SD v1.5 VAE was trained with latents scaled by 0.18215
        scaling_factor = getattr(vae.config, "scaling_factor", 0.18215)
        scaled_latents = latents / scaling_factor

        with torch.no_grad():
            # Pass through VAE decoder
            image_tensor = vae.decode(scaled_latents.to(vae.dtype)).sample

        # Convert from [-1, 1] tensor to [0, 1]
        image_tensor = (image_tensor / 2 + 0.5).clamp(0, 1)

        # Move to CPU and format as HWC numpy array
        image_np = image_tensor.cpu().permute(0, 2, 3, 1).float().numpy()[0]
        
        # Convert to 8-bit integer PIL Image
        image_pil = Image.fromarray((image_np * 255).round().astype("uint8"))
        return image_pil

    @abstractmethod
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
        Executes the denoising loop and returns the generated image along with metadata.
        
        Returns:
            dict containing:
                - 'image': PIL.Image.Image
                - 'sampler_name': str
                - 'num_steps': int
                - 'generation_time': float (seconds)
                - 'seed': int
                - 'model_name': str
                - 'prompt': str
                - 'guidance_scale': float
        """
        pass
