"""
samplers/ddim_custom.py - Custom DDIM Sampler implementing Song et al. (2020) manually.

This file DOES NOT use Hugging Face Diffusers' DDIMScheduler.step().
Instead, it explicitly implements the mathematical update equation of Denoising
Diffusion Implicit Models (DDIM):

  x_{t_prev} = sqrt(alpha_{t_prev}) * [ (x_t - sqrt(1 - alpha_t) * eps) / sqrt(alpha_t) ]
               + sqrt(1 - alpha_{t_prev} - sigma_t^2) * eps
               + sigma_t * random_noise

Where:
  1. [ (x_t - sqrt(1 - alpha_t) * eps) / sqrt(alpha_t) ] is the 'predicted x_0'
  2. sqrt(1 - alpha_{t_prev} - sigma_t^2) * eps is the 'direction pointing to x_t'
  3. sigma_t * random_noise is the stochastic noise term (sigma_t = 0 for deterministic DDIM)
"""

import time
import sys
from typing import Dict, Any, Optional, List
import numpy as np
import torch
from diffusers import StableDiffusionPipeline
from samplers.base import BaseSampler
from config import (
    DEFAULT_STEPS,
    DEFAULT_GUIDANCE_SCALE,
    DEFAULT_HEIGHT,
    DEFAULT_WIDTH,
    DEFAULT_SEED,
    DEFAULT_NEGATIVE_PROMPT,
)


class CustomDDIMSampler(BaseSampler):
    """
    Custom DDIM Sampler.
    
    Implements the non-Markovian sampling trajectory described in:
    'Denoising Diffusion Implicit Models' (Song, Sohl-Dickstein, Ermon, ICLR 2021).
    
    Allows skipping steps (e.g., from 1000 down to 10-20 steps) while maintaining
    high perceptual quality, thanks to its deterministic ODE formulation (when eta=0.0).
    """

    def __init__(
        self,
        pipe: StableDiffusionPipeline,
        device: str = None,
        dtype: torch.dtype = None,
        eta: float = 0.0,
    ):
        super().__init__(
            pipe=pipe,
            device=device or pipe.device.type,
            dtype=dtype or pipe.unet.dtype,
        )
        self.sampler_name = "DDIM (Custom Mathematical)"
        self.eta = eta  # eta = 0.0 yields deterministic ODE sampling

        # Extract the precomputed cumulative product of alphas (alpha_bar) from the model scheduler
        # alphas_cumprod is a tensor of shape [1000] containing cumulative (1 - beta_t)
        self.alphas_cumprod = self.pipe.scheduler.alphas_cumprod.to(
            device=self.device, dtype=self.dtype
        )
        self.num_train_timesteps = len(self.alphas_cumprod)

    def _get_timesteps(self, num_inference_steps: int) -> List[int]:
        """
        Subsamples discrete timesteps from the full 1000 training timesteps.
        
        Example: for num_inference_steps = 5:
        Produces steps like [999, 799, 599, 399, 199]
        """
        step_ratio = self.num_train_timesteps // num_inference_steps
        # Uniformly spaced integer timesteps in reverse order (T -> 0)
        timesteps = (
            np.arange(0, num_inference_steps) * step_ratio
        ).round()[::-1].copy().astype(np.int64)
        return timesteps.tolist()

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
        Executes the manual DDIM sampling loop step-by-step.
        """
        unet = self.pipe.unet
        generator = self.get_generator(seed)

        # 1. Prepare Text Embeddings for Classifier-Free Guidance (CFG)
        # Shape: (2, 77, 768) -> [unconditional_embeds, conditional_embeds]
        text_embeddings = self.get_text_embeddings(
            prompt=prompt,
            negative_prompt=negative_prompt,
            batch_size=1,
        )

        # 2. Sample Initial Latent Noise z_T from standard Normal Distribution N(0, I)
        # Latent dimensions are H/8, W/8 (e.g. 512x512 -> 64x64 with 4 channels)
        latent_channels = unet.config.in_channels
        latent_h = height // 8
        latent_w = width // 8
        latents_shape = (1, latent_channels, latent_h, latent_w)

        latents = torch.randn(
            latents_shape,
            generator=generator,
            device=self.device,
            dtype=self.dtype,
        )

        # 3. Compute the custom discrete timesteps sequence
        timesteps = self._get_timesteps(num_inference_steps)

        # Start timer for benchmark comparison
        start_time = time.perf_counter()

        try:
            with torch.inference_mode():
                for i, t in enumerate(timesteps):
                    # Determine previous timestep t_prev in the sequence
                    t_prev = timesteps[i + 1] if i + 1 < len(timesteps) else -1

                    # --- Step A: Classifier-Free Guidance (CFG) UNet Forward Pass ---
                    # Duplicate latents so we can evaluate unconditional and conditional passes in parallel
                    latent_model_input = torch.cat([latents, latents])

                    # Prepare timestep tensor for UNet
                    timestep_tensor = torch.tensor([t], device=self.device)

                    # Predict the noise residual using the UNet
                    noise_pred = unet(
                        latent_model_input,
                        timestep_tensor,
                        encoder_hidden_states=text_embeddings,
                    ).sample

                    # Split predictions into unconditional and conditional
                    noise_pred_uncond, noise_pred_text = noise_pred.chunk(2)

                    # CFG equation: eps = eps_uncond + s * (eps_text - eps_uncond)
                    eps_theta = noise_pred_uncond + guidance_scale * (
                        noise_pred_text - noise_pred_uncond
                    )

                    # --- Step B: Mathematical DDIM Update (Song et al., 2020) ---
                    # alpha_bar_t: cumulative variance product at current timestep t
                    alpha_bar_t = self.alphas_cumprod[t]

                    # alpha_bar_t_prev: cumulative variance product at t_prev (or 1.0 if we reached the final step)
                    if t_prev >= 0:
                        alpha_bar_t_prev = self.alphas_cumprod[t_prev]
                    else:
                        alpha_bar_t_prev = torch.tensor(1.0, device=self.device, dtype=self.dtype)

                    # 1. Estimate predicted clean latent x_0 ("pred_original_sample")
                    # pred_x0 = (x_t - sqrt(1 - alpha_bar_t) * eps_theta) / sqrt(alpha_bar_t)
                    pred_x0 = (latents - torch.sqrt(1.0 - alpha_bar_t) * eps_theta) / torch.sqrt(alpha_bar_t)

                    # 2. Compute variance sigma_t
                    # When eta == 0.0, sigma_t = 0 (completely deterministic ODE trajectory)
                    if self.eta > 0.0 and t_prev >= 0:
                        sigma_t = (
                            self.eta
                            * torch.sqrt((1.0 - alpha_bar_t_prev) / (1.0 - alpha_bar_t))
                            * torch.sqrt(1.0 - alpha_bar_t / alpha_bar_t_prev)
                        )
                    else:
                        sigma_t = torch.tensor(0.0, device=self.device, dtype=self.dtype)

                    # 3. Compute directional vector pointing back to x_t
                    # dir_xt = sqrt(1 - alpha_bar_t_prev - sigma_t^2) * eps_theta
                    dir_xt = torch.sqrt(
                        torch.clamp(1.0 - alpha_bar_t_prev - (sigma_t ** 2), min=0.0)
                    ) * eps_theta

                    # 4. Compute next latent x_{t_prev}
                    # x_{t_prev} = sqrt(alpha_bar_t_prev) * pred_x0 + dir_xt + sigma_t * noise
                    latents = torch.sqrt(alpha_bar_t_prev) * pred_x0 + dir_xt

                    # Add random noise only if eta > 0
                    if self.eta > 0.0 and t_prev >= 0:
                        noise = torch.randn(
                            latents.shape,
                            generator=generator,
                            device=self.device,
                            dtype=self.dtype,
                        )
                        latents = latents + sigma_t * noise

        except torch.cuda.OutOfMemoryError as oom:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            print(f"[CustomDDIMSampler] CUDA OutOfMemory encountered: {oom}", file=sys.stderr)
            raise oom

        # 4. Decode Clean Latents into RGB PIL Image
        image = self.decode_latents(latents)

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
            "eta": self.eta,
        }
