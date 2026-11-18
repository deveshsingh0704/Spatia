"""
LSUN Bedroom Dataset Sampler & Preprocessor for Stable Diffusion Fine-Tuning.

Features:
- Traverses the nested LSUN directory structure (0/0/0/....jpg).
- Uses reservoir sampling / random sampling without loading all paths into memory at once.
- Validates image integrity using PIL.
- Optionally resizes/crops to target resolution (default: 512x512).
- Generates Hugging Face format metadata.csv or metadata.jsonl with default bedroom prompts.
"""

import argparse
import csv
import json
import os
import random
import sys
from pathlib import Path
from PIL import Image


DEFAULT_PROMPTS = [
    "a photo of a bedroom",
    "a clean modern bedroom",
    "a cozy bedroom with a bed and side tables",
    "interior view of a bedroom",
    "a well lit bedroom with comfortable bed",
]


def collect_image_paths(source_dir: Path, max_scan: int = 50000):
    """Scan nested subdirectories and yield image file paths."""
    count = 0
    for root, _, files in os.walk(source_dir):
        for f in files:
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                yield Path(root) / f
                count += 1
                if max_scan and count >= max_scan:
                    return


def sample_and_prepare(
    source_dir: str,
    output_dir: str,
    num_samples: int = 5000,
    target_size: int = 512,
    seed: int = 42,
    format_type: str = "jsonl",
):
    random.seed(seed)
    src_path = Path(source_dir)
    out_path = Path(output_dir)
    images_out = out_path / "images"
    images_out.mkdir(parents=True, exist_ok=True)

    if not src_path.exists():
        print(f"Error: Source directory does not exist: {src_path}")
        sys.exit(1)

    print(f"Scanning images from {src_path} (sampling target: {num_samples})...")

    # Reservoir sampling to avoid loading millions of paths into RAM
    sampled_paths = []
    total_scanned = 0

    for p in collect_image_paths(src_path, max_scan=num_samples * 10):
        total_scanned += 1
        if len(sampled_paths) < num_samples:
            sampled_paths.append(p)
        else:
            j = random.randint(0, total_scanned - 1)
            if j < num_samples:
                sampled_paths[j] = p

    print(f"Collected {len(sampled_paths)} candidate images from {total_scanned} scanned files.")

    metadata_records = []
    saved_count = 0

    print("Processing, resizing, and writing images...")
    for idx, img_path in enumerate(sampled_paths):
        try:
            with Image.open(img_path) as img:
                img = img.convert("RGB")
                
                # Center crop to square then resize to target_size
                w, h = img.size
                min_dim = min(w, h)
                left = (w - min_dim) // 2
                top = (h - min_dim) // 2
                right = left + min_dim
                bottom = top + min_dim
                
                img_cropped = img.crop((left, top, right, bottom))
                if target_size > 0:
                    img_resized = img_cropped.resize((target_size, target_size), Image.Resampling.LANCZOS)
                else:
                    img_resized = img_cropped

                dest_filename = f"bedroom_{saved_count:06d}.jpg"
                dest_file_path = images_out / dest_filename
                img_resized.save(dest_file_path, "JPEG", quality=95)

                prompt = random.choice(DEFAULT_PROMPTS)
                rel_path = f"images/{dest_filename}"
                metadata_records.append({"file_name": rel_path, "text": prompt})
                saved_count += 1

                if saved_count % 500 == 0:
                    print(f"Saved {saved_count}/{len(sampled_paths)} images...")
        except Exception as e:
            # Skip corrupted images
            continue

    print(f"\nSuccessfully prepared {saved_count} images in {images_out}")

    # Write metadata file
    if format_type == "csv":
        metadata_file = out_path / "metadata.csv"
        with open(metadata_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["file_name", "text"])
            writer.writeheader()
            writer.writerows(metadata_records)
        print(f"Metadata saved to: {metadata_file}")
    else:
        metadata_file = out_path / "metadata.jsonl"
        with open(metadata_file, "w", encoding="utf-8") as f:
            for item in metadata_records:
                f.write(json.dumps(item) + "\n")
        print(f"Metadata saved to: {metadata_file}")


def main():
    parser = argparse.ArgumentParser(description="Sample and prepare LSUN bedroom dataset for SD1.5 fine-tuning.")
    parser.add_argument(
        "--source_dir",
        type=str,
        default=r"C:\Users\deves\Downloads\lsun dataset",
        help="Path to unzipped LSUN dataset directory",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default=r"D:\LatentCraft\server\dataset\lsun_bedroom_subset",
        help="Target folder for prepared subset",
    )
    parser.add_argument(
        "--num_samples",
        type=int,
        default=5000,
        help="Number of images to sample (e.g. 2000 or 5000)",
    )
    parser.add_argument(
        "--target_size",
        type=int,
        default=512,
        help="Image resolution (default 512 for SD1.5)",
    )
    parser.add_argument(
        "--format",
        type=str,
        choices=["jsonl", "csv"],
        default="jsonl",
        help="HuggingFace dataset metadata format",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed")

    args = parser.parse_args()
    sample_and_prepare(
        source_dir=args.source_dir,
        output_dir=args.output_dir,
        num_samples=args.num_samples,
        target_size=args.target_size,
        seed=args.seed,
        format_type=args.format,
    )


if __name__ == "__main__":
    main()

