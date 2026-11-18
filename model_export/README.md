# LatentCraft: SD 1.5 LSUN Bedroom LoRA Adapter

---
language: en
tags:
- stable-diffusion
- stable-diffusion-diffusers
- text-to-image
- diffusers
- lora
- lsun
- interior-design
- architecture
base_model: runwayml/stable-diffusion-v1-5
instance_prompt: a photography of a bedroom
license: creativeml-openrail-m
---

# LatentCraft SD 1.5 Bedroom LoRA

This repository contains lightweight **LoRA (Low-Rank Adaptation)** weights fine-tuned on the **LSUN Bedroom Dataset** paired with high-fidelity visual captions generated via Salesforce BLIP.

- **Base Architecture**: Stable Diffusion v1.5 (`runwayml/stable-diffusion-v1-5`)
- **LoRA Rank ($r$)**: 16
- **LoRA Alpha ($\alpha$)**: 16
- **Target Modules**: Cross-attention & Self-attention projections (`to_k`, `to_q`, `to_v`, `to_out.0`)
- **File Format**: `safetensors` (~12.8 MB)
- **Training Precision**: FP16 mixed precision
- **Training Epochs**: 10 Epochs (5,000 optimization steps)

---

## Intended Use

Specifically trained to generate photorealistic bedroom mockups, interior designs, and architectural visualizations with authentic perspective and lighting.

### Prompting Recommendations:
- **Trigger / Keyword**: `"a photography of a bedroom..."`
- **Recommended Sampler**: `DDIM` (20 to 30 steps) or `Euler A`
- **CFG Scale**: `7.0` - `8.0`
- **Recommended LoRA Strength / Weight**: `0.7` to `0.9`

```
Prompt: a photography of a modern minimalist master bedroom, warm morning sunlight, king size bed with crisp white linen, oak wood flooring, architectural interior design, 8k resolution
Negative Prompt: blurry, distorted, low quality, bad architecture, deformed, watermark
```

---

## Quickstart via Diffusers (Python)

```python
import torch
from diffusers import StableDiffusionPipeline

pipe = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    torch_dtype=torch.float16
).to("cuda")

# Load LatentCraft LoRA adapter
pipe.load_lora_weights(".", weight_name="latentcraft_sd15_bedroom_lora.safetensors")

image = pipe(
    prompt="a photography of a luxury suite bedroom with floor-to-ceiling windows, king bed, interior design photograph, 8k",
    negative_prompt="blurry, deformed, low quality",
    num_inference_steps=25,
    guidance_scale=7.5
).images[0]

image.save("bedroom_mockup.png")
```

---

## WebUI / ComfyUI Installation

1. Copy `latentcraft_sd15_bedroom_lora.safetensors` into your `models/Lora` directory:
   - **Automatic1111 / Forge**: `stable-diffusion-webui/models/Lora/`
   - **ComfyUI**: `ComfyUI/models/loras/`
2. In prompt, invoke via: `<lora:latentcraft_sd15_bedroom_lora:0.8>`

