"""
Compare Visual Image Quality: Base SD 1.5 vs Fine-Tuned (LSUN Bedroom LoRA).

Runs both pipelines with identical prompts, guidance scale, scheduler, and seed,
generating side-by-side comparison images.
"""

import argparse
from pathlib import Path
import torch
from diffusers import StableDiffusionPipeline
from PIL import Image, ImageDraw, ImageFont


TEST_PROMPTS = [
    {
        "title": "Modern Minimalist Bedroom",
        "prompt": "a photography of a modern minimalist master bedroom, warm morning sunlight, king size bed with crisp white linen, oak wood flooring, large panoramic window, architectural interior design, 8k",
    },
    {
        "title": "Cozy Dark Wood Cabin Bedroom",
        "prompt": "a photography of a cozy bedroom with dark wood paneling, bedside reading lamps, soft wool blanket on bed, realistic shadows, photorealistic",
    },
    {
        "title": "Luxury Suite Hotel Bedroom",
        "prompt": "a photography of a luxury hotel suite bedroom, neutral color palette, elegant headboard, nightstands with ambient lamps, high end interior photography",
    },
]


def create_comparison_grid(img_base: Image.Image, img_lora: Image.Image, title: str) -> Image.Image:
    """Stitches base and LoRA images side-by-side with labels."""
    w, h = img_base.size
    header_h = 60
    canvas = Image.new("RGB", (w * 2 + 30, h + header_h + 40), color=(25, 25, 30))
    draw = ImageDraw.Draw(canvas)

    # Paste images
    canvas.paste(img_base, (10, header_h))
    canvas.paste(img_lora, (w + 20, header_h))

    # Add text labels
    draw.text((20, 20), f"Prompt: {title}", fill=(240, 240, 240))
    draw.text((20, header_h + h + 10), "Stable Diffusion 1.5 (Base Model)", fill=(180, 180, 190))
    draw.text((w + 30, header_h + h + 10), "SD 1.5 (Fine-Tuned Bedroom LoRA)", fill=(80, 220, 140))

    return canvas


def main():
    parser = argparse.ArgumentParser(description="Compare SD1.5 Base vs Fine-Tuned Bedroom LoRA")
    parser.add_argument(
        "--lora_path",
        type=str,
        default=r"D:\LatentCraft\server\outputs\sd15_bedroom_lora\final_bedroom_lora.safetensors",
        help="Path to trained LoRA safetensors",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default=r"D:\LatentCraft\server\outputs\comparisons",
        help="Target folder for comparison images",
    )
    parser.add_argument("--steps", type=int, default=25, help="Number of inference steps")
    parser.add_argument("--guidance_scale", type=float, default=7.5, help="CFG Guidance scale")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for exact alignment")

    args = parser.parse_args()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32

    out_path = Path(args.output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    print("=" * 65)
    print("  STABLE DIFFUSION 1.5: BASE vs FINE-TUNED BEDROOM COMPARISON  ")
    print("=" * 65)
    print(f"Device: {device} | Dtype: {dtype}")
    print(f"LoRA path: {args.lora_path}\n")

    # 1. Load Base Model
    print("Loading Base SD 1.5 pipeline...")
    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=dtype,
        safety_checker=None,
    ).to(device)
    pipe.enable_attention_slicing()

    base_images = []
    print("\n[Phase 1] Generating images with Base SD 1.5...")
    for idx, item in enumerate(TEST_PROMPTS):
        generator = torch.Generator(device=device).manual_seed(args.seed)
        print(f"  -> Generating sample {idx+1}/{len(TEST_PROMPTS)}: {item['title']}...")
        img = pipe(
            prompt=item["prompt"],
            negative_prompt="blurry, distorted, low quality, bad architecture, deformed, watermark",
            num_inference_steps=args.steps,
            guidance_scale=args.guidance_scale,
            generator=generator,
        ).images[0]
        base_images.append(img)

    # 2. Inject LoRA Weights
    lora_file = Path(args.lora_path)
    if not lora_file.exists():
        print(f"Error: LoRA file not found at {lora_file}!")
        return

    print(f"\n[Phase 2] Injecting Fine-Tuned Bedroom LoRA ({lora_file.name})...")
    pipe.load_lora_weights(str(lora_file.parent), weight_name=lora_file.name)

    lora_images = []
    print("Generating images with SD 1.5 + Fine-Tuned Bedroom LoRA...")
    for idx, item in enumerate(TEST_PROMPTS):
        generator = torch.Generator(device=device).manual_seed(args.seed)
        print(f"  -> Generating sample {idx+1}/{len(TEST_PROMPTS)}: {item['title']}...")
        img = pipe(
            prompt=item["prompt"],
            negative_prompt="blurry, distorted, low quality, bad architecture, deformed, watermark",
            num_inference_steps=args.steps,
            guidance_scale=args.guidance_scale,
            generator=generator,
        ).images[0]
        lora_images.append(img)

    # 3. Create Side-by-Side Visual Grids
    print("\n[Phase 3] Assembling side-by-side comparison grids...")
    for idx, item in enumerate(TEST_PROMPTS):
        grid = create_comparison_grid(base_images[idx], lora_images[idx], item["title"])
        save_file = out_path / f"comparison_{idx+1}_{item['title'].lower().replace(' ', '_')}.png"
        grid.save(save_file)
        print(f"  Saved comparison grid: {save_file}")

    print("\nAll comparison grids created successfully in:")
    print(f"  {out_path}")


if __name__ == "__main__":
    main()

