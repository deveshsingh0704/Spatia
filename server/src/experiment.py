"""
experiment.py - Automated Benchmark Experiment comparing DDPM vs. Custom DDIM.

This script runs the automated experiment suite:
  samplers = ["DDPM", "DDIM"]
  steps = [5, 10, 15, 20, 30, 50]

Features:
1. Keeps model, prompt, seed, resolution, guidance scale, and hardware strictly identical.
2. Saves all generated images to outputs/experiments/.
3. Logs timing and metadata to outputs/experiments/experiment_results.csv with columns:
     sampler, steps, seed, generation_time, image_path, prompt
4. Generates an annotated side-by-side comparison grid image for instant visual assessment.
"""

import os
import csv
import sys
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import pandas as pd

from config import (
    MODEL_ID,
    DEVICE,
    DEFAULT_PROMPT,
    DEFAULT_SEED,
    DEFAULT_GUIDANCE_SCALE,
    DEFAULT_HEIGHT,
    DEFAULT_WIDTH,
    EXPERIMENT_SAMPLERS,
    EXPERIMENT_STEPS,
    EXPERIMENTS_DIR,
    EXPERIMENT_CSV,
)
from pipeline_loader import load_pipeline
from samplers import get_sampler


def create_comparison_grid(
    records: list,
    output_path: Path,
    steps_list: list,
    samplers_list: list,
):
    """
    Stitches generated images into a labeled 2D comparison grid:
    Rows = Samplers (DDPM, DDIM)
    Cols = Step counts (5, 10, 15, 20, 30, 50)
    """
    if not records:
        return

    # Map (sampler, steps) -> image_path
    img_map = {(r["sampler"], r["steps"]): r["image_path"] for r in records}
    
    thumb_w, thumb_h = 256, 256
    padding_top = 60
    padding_left = 120
    
    grid_w = padding_left + len(steps_list) * thumb_w
    grid_h = padding_top + len(samplers_list) * thumb_h
    
    grid_img = Image.new("RGB", (grid_w, grid_h), color=(24, 24, 27))
    draw = ImageDraw.Draw(grid_img)
    
    # Load basic font
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None

    # Draw Column Headers (Steps)
    for col_idx, step in enumerate(steps_list):
        x = padding_left + col_idx * thumb_w + thumb_w // 2 - 30
        y = 20
        draw.text((x, y), f"{step} Steps", fill=(240, 240, 240), font=font)

    # Draw Rows and Paste Images
    for row_idx, sampler in enumerate(samplers_list):
        y = padding_top + row_idx * thumb_h + thumb_h // 2 - 10
        draw.text((15, y), sampler, fill=(147, 197, 253), font=font)
        
        for col_idx, step in enumerate(steps_list):
            img_path = img_map.get((sampler, step))
            if img_path and Path(img_path).exists():
                thumb = Image.open(img_path).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                paste_x = padding_left + col_idx * thumb_w
                paste_y = padding_top + row_idx * thumb_h
                grid_img.paste(thumb, (paste_x, paste_y))
                
                # Overlay generation time on the bottom of the thumbnail
                gen_time = next(r["generation_time"] for r in records if r["sampler"] == sampler and r["steps"] == step)
                time_label = f"{gen_time:.2f}s"
                draw.rectangle(
                    [paste_x + 5, paste_y + thumb_h - 22, paste_x + 60, paste_y + thumb_h - 4],
                    fill=(0, 0, 0, 180),
                )
                draw.text((paste_x + 8, paste_y + thumb_h - 20), time_label, fill=(74, 222, 128), font=font)

    grid_img.save(output_path)
    print(f"[Experiment] Visual comparison grid saved to: {output_path}")


def run_experiment(
    prompt: str = DEFAULT_PROMPT,
    seed: int = DEFAULT_SEED,
    guidance_scale: float = DEFAULT_GUIDANCE_SCALE,
    samplers: list = None,
    steps: list = None,
) -> pd.DataFrame:
    """
    Executes the benchmark matrix across specified samplers and step counts.
    """
    samplers = samplers or EXPERIMENT_SAMPLERS
    steps = steps or EXPERIMENT_STEPS

    print("\n" + "=" * 65)
    print("      FAST DESIGN-MOCKUP GENERATOR: EXPERIMENT BENCHMARK")
    print("=" * 65)
    print(f" Prompt:         '{prompt}'")
    print(f" Seed:           {seed}")
    print(f" Guidance Scale: {guidance_scale}")
    print(f" Samplers:       {samplers}")
    print(f" Step Counts:    {steps}")
    print(f" Total Runs:     {len(samplers) * len(steps)}")
    print("=" * 65 + "\n")

    # Load shared pipeline once
    pipe = load_pipeline()

    records = []
    total_runs = len(samplers) * len(steps)
    current_run = 0

    for sampler_name in samplers:
        # Instantiate the sampler
        sampler = get_sampler(sampler_name, pipe)
        print(f"\n[Benchmarking] Starting sampler: {sampler_name}")

        for step_count in steps:
            current_run += 1
            print(f"  --> Run {current_run}/{total_runs}: {sampler_name} at {step_count} steps...")

            # Run inference
            result = sampler.sample(
                prompt=prompt,
                num_inference_steps=step_count,
                guidance_scale=guidance_scale,
                seed=seed,
                height=DEFAULT_HEIGHT,
                width=DEFAULT_WIDTH,
            )

            # Save individual mockup image
            clean_sampler = sampler_name.replace(" ", "_").replace("(", "").replace(")", "").replace("/", "")
            image_filename = f"{clean_sampler}_steps{step_count}_seed{seed}.png"
            image_filepath = EXPERIMENTS_DIR / image_filename
            result["image"].save(image_filepath)

            # Record metrics
            record = {
                "sampler": sampler_name,
                "steps": step_count,
                "seed": seed,
                "generation_time": result["generation_time"],
                "image_path": str(image_filepath),
                "prompt": prompt,
            }
            records.append(record)
            print(f"      Finished in {result['generation_time']:.2f}s -> Saved: {image_filename}")

    # Save to CSV
    df = pd.DataFrame(records)
    
    # Check if CSV already exists to append or write new with headers
    file_exists = EXPERIMENT_CSV.exists()
    df.to_csv(
        EXPERIMENT_CSV,
        mode="a" if file_exists else "w",
        index=False,
        header=not file_exists,
    )
    print(f"\n[Experiment] Benchmark metrics successfully saved to: {EXPERIMENT_CSV}")

    # Generate visual comparison grid
    grid_filepath = EXPERIMENTS_DIR / f"comparison_grid_seed{seed}.png"
    create_comparison_grid(records, grid_filepath, steps, samplers)

    # Print summary table
    print("\n--- Summary Benchmark Results ---")
    summary_df = df[["sampler", "steps", "generation_time", "image_path"]]
    print(summary_df.to_string(index=False))
    print("=" * 65 + "\n")

    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run DDPM vs DDIM Diffusion Benchmark.")
    parser.add_argument("--prompt", type=str, default=DEFAULT_PROMPT, help="Text prompt for mockups")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Random seed")
    parser.add_argument("--guidance", type=float, default=DEFAULT_GUIDANCE_SCALE, help="Guidance scale")
    
    args = parser.parse_args()
    run_experiment(
        prompt=args.prompt,
        seed=args.seed,
        guidance_scale=args.guidance,
    )
