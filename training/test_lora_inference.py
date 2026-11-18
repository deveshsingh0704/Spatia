"""
Inference script to test SD1.5 with the trained Bedroom LoRA weights.
"""

import argparse
import torch
from pathlib import Path
from diffusers import StableDiffusionPipeline
from peft import PeftModel


def generate(
    lora_path: str,
    prompt: str = "a modern luxury bedroom with floor-to-ceiling windows, king bed, interior design photograph, 8k",
    negative_prompt: str = "blurry, low quality, distorted, bad architecture, deformed",
    output_image: str = "bedroom_test.png",
    steps: int = 30,
    guidance_scale: float = 7.5,
    seed: int = 42,
):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading SD1.5 base model on {device}...")
    
    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        safety_checker=None,
    ).to(device)

    lora_file = Path(lora_path)
    if lora_file.exists():
        print(f"Loading Bedroom LoRA adapter from: {lora_file}...")
        if lora_file.is_dir():
            pipe.load_lora_weights(str(lora_file), weight_name="adapter_model.safetensors")
        else:
            pipe.load_lora_weights(str(lora_file.parent), weight_name=lora_file.name)
    else:
        print(f"Warning: LoRA path {lora_file} not found! Running base model instead.")

    generator = torch.Generator(device=device).manual_seed(seed)
    print(f"Generating image for prompt: '{prompt}'...")
    image = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_inference_steps=steps,
        guidance_scale=guidance_scale,
        generator=generator,
    ).images[0]

    image.save(output_image)
    print(f"Saved generated bedroom image to: {output_image}")


def main():
    parser = argparse.ArgumentParser(description="Test SD1.5 + Bedroom LoRA Inference")
    parser.add_argument("--lora_path", type=str, default=r"D:\LatentCraft\server\outputs\sd15_bedroom_lora\final_bedroom_lora.safetensors")
    parser.add_argument("--prompt", type=str, default="a modern luxury bedroom with king bed, ambient lighting, high resolution")
    parser.add_argument("--out", type=str, default="sample_bedroom.png")
    parser.add_argument("--steps", type=int, default=30)
    args = parser.parse_args()

    generate(lora_path=args.lora_path, prompt=args.prompt, output_image=args.out, steps=args.steps)


if __name__ == "__main__":
    main()

