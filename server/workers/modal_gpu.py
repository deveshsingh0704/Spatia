"""
LatentCraft Serverless GPU Inference Worker (Modal)
---------------------------------------------------
Runs Stable Diffusion v1.5 (Base & Bedroom LoRA) on an on-demand NVIDIA L4 GPU.
Bills $0.00 when idle. Uploads generated PNGs (with embedded PngInfo metadata)
directly to your AWS S3 bucket and returns canonical URLs to the CPU FastAPI server.

Deploy steps:
  1. pip install modal
  2. modal token new
  3. Create Modal secrets named "latentcraft-aws" with:
       S3_BUCKET_NAME, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION,
       GPU_WORKER_SECRET (shared bearer token between FastAPI and Modal)
  4. Upload healthy checkpoint-500 LoRA to s3://<bucket>/models/bedroom_lora.safetensors
     (handled by server/scripts/sync_lora_to_s3.py)
  5. modal deploy server/workers/modal_gpu.py
  6. Copy the printed HTTPS endpoint URL into your Render/Railway CPU API env as GPU_WORKER_URL.
"""

import io
import json
import os
import time
import uuid
from typing import Optional

import modal

app = modal.App("latentcraft-gpu-worker")

# Bake Python ML dependencies + pre-cache SD 1.5 weights inside the image for fast cold starts
def _download_base_model():
    import torch
    from diffusers import StableDiffusionPipeline
    StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float16,
        safety_checker=None,
    )


gpu_image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "torch==2.5.1",
        "torchvision==0.20.1",
        "diffusers==0.31.0",
        "transformers==4.48.3",
        "huggingface-hub==0.36.2",
        "accelerate==1.2.1",
        "peft==0.14.0",
        "safetensors>=0.4.0",
        "pillow>=10.0.0",
        "boto3>=1.35.0",
        "fastapi[standard]>=0.115.0",
    )
    .run_function(_download_base_model)
)


@app.cls(
    image=gpu_image,
    gpu="T4",
    scaledown_window=120,
    secrets=[modal.Secret.from_name("latentcraft-aws")],
)
class DiffusionWorker:
    @modal.enter()
    def load_pipelines(self):
        import boto3
        import torch
        from botocore.config import Config
        from diffusers import DDIMScheduler, DDPMScheduler, StableDiffusionPipeline
        from safetensors.torch import load_file as load_safetensors

        self.device = "cuda"
        self.base_pipe = StableDiffusionPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5",
            torch_dtype=torch.float16,
            safety_checker=None,
            local_files_only=True,
        ).to(self.device)
        self.base_pipe.enable_attention_slicing()
        self.base_pipe.enable_vae_slicing()
        self.ddim_config = self.base_pipe.scheduler.config

        # Download Bedroom LoRA weights from AWS S3 (models/bedroom_lora.safetensors)
        self.bucket = os.environ["S3_BUCKET_NAME"].strip()
        self.region = os.environ.get("S3_REGION", "ap-southeast-2").strip()
        self.s3 = boto3.client(
            "s3",
            aws_access_key_id=os.environ["S3_ACCESS_KEY_ID"].strip(),
            aws_secret_access_key=os.environ["S3_SECRET_ACCESS_KEY"].strip(),
            region_name=self.region,
            config=Config(signature_version="s3v4"),
        )

        lora_local = "/tmp/bedroom_lora.safetensors"
        lora_s3_key = os.environ.get("LORA_S3_KEY", "models/bedroom_lora.safetensors").strip()
        self.lora_loaded = False
        try:
            self.s3.download_file(self.bucket, lora_s3_key, lora_local)
            raw_sd = load_safetensors(lora_local)
            fixed_sd = {
                ("unet." + k[len("base_model.model."):] if k.startswith("base_model.model.") else k): v
                for k, v in raw_sd.items()
            }
            self.base_pipe.load_lora_weights(fixed_sd, adapter_name="bedroom")
            self.lora_loaded = True
            print(f"[Modal Worker] Loaded Bedroom LoRA from s3://{self.bucket}/{lora_s3_key}")
        except Exception as e:
            print(f"[Modal Worker] Warning: could not load LoRA from S3 ({e}); base SD 1.5 remains active.")

        self.DDIMScheduler = DDIMScheduler
        self.DDPMScheduler = DDPMScheduler

    @modal.fastapi_endpoint(method="POST")
    def generate(self, item: dict, authorization: Optional[str] = None):
        import torch
        from fastapi import HTTPException
        from PIL.PngImagePlugin import PngInfo

        expected_secret = os.environ.get("GPU_WORKER_SECRET", "").strip()
        if expected_secret:
            if not authorization or authorization.strip() != f"Bearer {expected_secret}":
                raise HTTPException(status_code=401, detail="Unauthorized GPU worker call")

        prompt = (item.get("prompt") or "").strip()
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")

        negative_prompt = item.get("negative_prompt") or "blurry, grain, noise, low quality"
        model_name = item.get("model_name") or "Stable Diffusion v1.5 (Fine-Tuned)"
        sampler_name = (item.get("sampler_name") or "DDIM").upper()
        steps = int(item.get("steps") or 20)
        guidance_scale = float(item.get("guidance_scale") or 7.5)
        seed = int(item.get("seed") if item.get("seed") is not None else 42)
        width = int(item.get("width") or 512)
        height = int(item.get("height") or 512)

        # Toggle LoRA adapter cleanly per request without reloading base weights
        use_lora = "fine-tuned" in model_name.lower() or "lora" in model_name.lower()
        if self.lora_loaded:
            if use_lora:
                self.base_pipe.set_adapters(["bedroom"], adapter_weights=[0.8])
            else:
                self.base_pipe.disable_lora()

        if "DDPM" in sampler_name:
            self.base_pipe.scheduler = self.DDPMScheduler.from_config(self.ddim_config)
        else:
            self.base_pipe.scheduler = self.DDIMScheduler.from_config(self.ddim_config)

        generator = torch.Generator(device="cpu").manual_seed(seed)
        torch.cuda.reset_peak_memory_stats()
        t0 = time.perf_counter()
        with torch.inference_mode():
            img = self.base_pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                num_inference_steps=steps,
                guidance_scale=guidance_scale,
                width=width,
                height=height,
                generator=generator,
            ).images[0]
        latency = round(time.perf_counter() - t0, 2)
        peak_vram_mb = round(torch.cuda.max_memory_allocated() / (1024 ** 2), 1)
        gpu_name = torch.cuda.get_device_name(0)

        # Embed full metadata into PNG and upload to AWS S3
        meta = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "model_name": model_name,
            "sampler_name": sampler_name,
            "steps": steps,
            "guidance_scale": guidance_scale,
            "seed": seed,
            "resolution": f"{width}x{height}",
            "latency_sec": latency,
            "peak_vram_mb": peak_vram_mb,
            "device": f"Modal {gpu_name}",
        }
        pnginfo = PngInfo()
        for k, v in meta.items():
            pnginfo.add_text(str(k), str(v))
        pnginfo.add_text("latentcraft_metadata", json.dumps(meta))

        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True, pnginfo=pnginfo)
        buf.seek(0)

        storage_key = f"gallery/mockup_{uuid.uuid4().hex[:12]}.png"
        self.s3.upload_fileobj(buf, self.bucket, storage_key, ExtraArgs={"ContentType": "image/png"})
        canonical_url = f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{storage_key}"

        return {
            "status": "completed",
            "canonical_image_url": canonical_url,
            "storage_key": storage_key,
            "latency_sec": latency,
            "peak_vram_mb": peak_vram_mb,
            "device": f"Modal {gpu_name}",
            "metadata": f"Generated on Modal {gpu_name} in {latency}s",
        }

