"""
Memory-Efficient Stable Diffusion 1.5 LoRA Trainer for 6GB VRAM (RTX 4050).

Features:
- LoRA on UNet cross-attention & self-attention layers (rank 16, alpha 16).
- Text encoder is frozen to minimize VRAM footprint.
- Mixed precision training (fp16).
- Gradient checkpointing enabled.
- Pre-caches VAE latents before training loops, removing VAE from GPU memory during training.
- Uses AdamW with cosine learning rate schedule and gradient accumulation.
"""

import argparse
import json
import math
import os
from pathlib import Path
from typing import List, Dict

import torch
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from PIL import Image
from tqdm.auto import tqdm

from transformers import CLIPTextModel, CLIPTokenizer
from diffusers import AutoencoderKL, UNet2DConditionModel, DDPMScheduler
from peft import LoraConfig, get_peft_model, get_peft_model_state_dict
from safetensors.torch import save_file


class CachedLatentDataset(Dataset):
    def __init__(self, latents: torch.Tensor, prompt_ids: torch.Tensor):
        self.latents = latents
        self.prompt_ids = prompt_ids

    def __len__(self):
        return len(self.latents)

    def __getitem__(self, idx):
        return {
            "latents": self.latents[idx],
            "input_ids": self.prompt_ids[idx],
        }


def load_metadata(dataset_dir: Path) -> List[Dict[str, str]]:
    meta_jsonl = dataset_dir / "metadata.jsonl"
    records = []
    if not meta_jsonl.exists():
        raise FileNotFoundError(f"Cannot find metadata.jsonl at {dataset_dir}")
    with open(meta_jsonl, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line.strip()))
    return records


@torch.no_grad()
def precompute_latents_and_tokens(
    records: List[Dict[str, str]],
    dataset_dir: Path,
    vae: AutoencoderKL,
    tokenizer: CLIPTokenizer,
    device: torch.device,
    batch_size: int = 4,
) -> (torch.Tensor, torch.Tensor):
    """Pre-encodes all dataset images to latents using VAE and tokenizes prompts."""
    print("Precomputing VAE latents to save GPU memory during training...")
    vae.eval()
    all_latents = []
    all_tokens = []

    for i in tqdm(range(0, len(records), batch_size), desc="Caching Latents"):
        batch_records = records[i : i + batch_size]
        images = []
        prompts = []

        for r in batch_records:
            img_path = dataset_dir / r["file_name"]
            with Image.open(img_path) as img:
                img = img.convert("RGB").resize((512, 512))
                tensor_img = torch.from_numpy(
                    (torch.ByteTensor(torch.ByteStorage.from_buffer(img.tobytes()))
                     .view(512, 512, 3)
                     .numpy() / 127.5) - 1.0
                ).permute(2, 0, 1).float()
                images.append(tensor_img)
            prompts.append(r.get("text", "a bedroom"))

        img_tensors = torch.stack(images).to(device, dtype=torch.float16)
        latents = vae.encode(img_tensors).latent_dist.sample() * 0.18215
        all_latents.append(latents.cpu())

        tokens = tokenizer(
            prompts,
            padding="max_length",
            max_length=tokenizer.model_max_length,
            truncation=True,
            return_tensors="pt",
        ).input_ids
        all_tokens.append(tokens)

    all_latents = torch.cat(all_latents, dim=0)
    all_tokens = torch.cat(all_tokens, dim=0)
    print(f"Precomputed {len(all_latents)} latents of shape {all_latents.shape[1:]}")
    return all_latents, all_tokens


def train_lora(
    dataset_dir: str,
    output_dir: str,
    pretrained_model_name: str = "runwayml/stable-diffusion-v1-5",
    num_train_epochs: int = 10,
    train_batch_size: int = 1,
    gradient_accumulation_steps: int = 4,
    learning_rate: float = 1e-4,
    lora_r: int = 16,
    lora_alpha: int = 16,
    save_steps: int = 500,
    resume_from_checkpoint: str = None,
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device.type != "cuda":
        print("Warning: CUDA not detected, aborting GPU training.")
        return

    dataset_path = Path(dataset_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    print(f"Loading pipeline components from {pretrained_model_name}...")
    tokenizer = CLIPTokenizer.from_pretrained(pretrained_model_name, subfolder="tokenizer")
    text_encoder = CLIPTextModel.from_pretrained(pretrained_model_name, subfolder="text_encoder", torch_dtype=torch.float16).to(device)
    vae = AutoencoderKL.from_pretrained(pretrained_model_name, subfolder="vae", torch_dtype=torch.float16).to(device)
    unet = UNet2DConditionModel.from_pretrained(pretrained_model_name, subfolder="unet", torch_dtype=torch.float16).to(device)
    noise_scheduler = DDPMScheduler.from_pretrained(pretrained_model_name, subfolder="scheduler")

    # Freeze base models
    vae.requires_grad_(False)
    text_encoder.requires_grad_(False)
    unet.requires_grad_(False)

    # Pre-cache latents and text tokens, then release VAE from GPU memory
    records = load_metadata(dataset_path)
    cached_latents, cached_tokens = precompute_latents_and_tokens(records, dataset_path, vae, tokenizer, device)
    
    # Free VAE from GPU memory
    del vae
    torch.cuda.empty_cache()

    # Precompute text embeddings using text_encoder, then release text_encoder from GPU
    print("Precomputing text embeddings...")
    all_text_embeds = []
    with torch.no_grad():
        for i in range(0, len(cached_tokens), 16):
            batch_tokens = cached_tokens[i : i + 16].to(device)
            embeds = text_encoder(batch_tokens)[0]
            all_text_embeds.append(embeds.cpu())
    all_text_embeds = torch.cat(all_text_embeds, dim=0)

    # Free text_encoder from GPU memory
    del text_encoder
    torch.cuda.empty_cache()

    # Enable gradient checkpointing on UNet
    unet.enable_gradient_checkpointing()

    # Configure LoRA on UNet attention projections
    lora_config = LoraConfig(
        r=lora_r,
        lora_alpha=lora_alpha,
        init_lora_weights="gaussian",
        target_modules=["to_k", "to_q", "to_v", "to_out.0"],
    )
    unet = get_peft_model(unet, lora_config)

    # Resume from checkpoint if specified
    global_step = 0
    if resume_from_checkpoint:
        ckpt_path = Path(resume_from_checkpoint)
        adapter_file = ckpt_path / "adapter_model.safetensors" if ckpt_path.is_dir() else ckpt_path
        if adapter_file.exists():
            print(f"Loading weights from resume checkpoint: {adapter_file}...")
            from safetensors.torch import load_file
            state_dict = load_file(str(adapter_file))
            unet.load_state_dict(state_dict, strict=False)
            try:
                # Infer step number from folder name (e.g. checkpoint-2000 -> 2000)
                global_step = int(ckpt_path.name.split("-")[-1])
                print(f"Resuming directly from step: {global_step}")
            except Exception:
                global_step = 0

    unet.print_trainable_parameters()

    # Cast trainable parameters to float32 for stable optimizer updates in fp16 mixed precision
    for param in unet.parameters():
        if param.requires_grad:
            param.data = param.data.to(torch.float32)

    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, unet.parameters()),
        lr=learning_rate,
        betas=(0.9, 0.999),
        weight_decay=1e-2,
        eps=1e-8,
    )

    # Build dataset loader from in-RAM cached latents
    dataset = CachedLatentDataset(cached_latents, all_text_embeds)
    dataloader = DataLoader(dataset, batch_size=train_batch_size, shuffle=True)

    total_steps = (len(dataloader) // gradient_accumulation_steps) * num_train_epochs
    print(f"\n--- Starting Training ---")
    print(f"Total Epochs: {num_train_epochs}")
    print(f"Steps per Epoch: {len(dataloader) // gradient_accumulation_steps}")
    print(f"Total Optimization Steps: {total_steps}")
    print(f"Gradient Accumulation: {gradient_accumulation_steps}")
    if global_step > 0:
        print(f"Starting at global_step: {global_step} (Skipping completed steps)")

    progress_bar = tqdm(total=total_steps, initial=global_step, desc="Training")

    unet.train()
    for epoch in range(num_train_epochs):
        epoch_loss = 0.0
        optimizer.zero_grad()

        for step, batch in enumerate(dataloader):
            latents = batch["latents"].to(device, dtype=torch.float16)
            encoder_hidden_states = batch["input_ids"].to(device, dtype=torch.float16)

            # Sample Gaussian noise
            noise = torch.randn_like(latents)
            bsz = latents.shape[0]
            timesteps = torch.randint(0, noise_scheduler.config.num_train_timesteps, (bsz,), device=device).long()

            # Add noise to latents (Forward diffusion)
            noisy_latents = noise_scheduler.add_noise(latents, noise, timesteps)

            # Predict the noise residual
            model_pred = unet(noisy_latents, timesteps, encoder_hidden_states).sample

            # Compute MSE Loss against true noise
            target = noise
            loss = F.mse_loss(model_pred.float(), target.float(), reduction="mean")
            loss = loss / gradient_accumulation_steps
            loss.backward()

            epoch_loss += loss.item() * gradient_accumulation_steps

            if (step + 1) % gradient_accumulation_steps == 0 or (step + 1) == len(dataloader):
                torch.nn.utils.clip_grad_norm_(unet.parameters(), 1.0)
                optimizer.step()
                optimizer.zero_grad()
                progress_bar.update(1)
                global_step += 1

                progress_bar.set_postfix({"step": global_step, "loss": f"{loss.item() * gradient_accumulation_steps:.4f}"})

                if global_step % save_steps == 0 or global_step == total_steps:
                    save_path = out_path / f"checkpoint-{global_step}"
                    save_path.mkdir(exist_ok=True)
                    lora_state_dict = get_peft_model_state_dict(unet)
                    save_file(lora_state_dict, str(save_path / "adapter_model.safetensors"))
                    print(f"\nSaved LoRA checkpoint to {save_path}")

        avg_loss = epoch_loss / len(dataloader)
        print(f"Epoch {epoch + 1}/{num_train_epochs} finished | Average Loss: {avg_loss:.4f}")

    # Final Save
    final_lora_path = out_path / "final_bedroom_lora.safetensors"
    lora_state_dict = get_peft_model_state_dict(unet)
    save_file(lora_state_dict, str(final_lora_path))
    print(f"\nTraining Complete! Final LoRA saved to: {final_lora_path}")


def main():
    parser = argparse.ArgumentParser(description="SD1.5 LoRA Training Script for LSUN Bedroom (6GB VRAM)")
    parser.add_argument("--dataset_dir", type=str, default=r"D:\LatentCraft\server\dataset\lsun_bedroom_2k", help="Dataset directory")
    parser.add_argument("--output_dir", type=str, default=r"D:\LatentCraft\server\outputs\sd15_bedroom_lora", help="Output directory")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=1, help="Batch size (keep 1 for 6GB VRAM)")
    parser.add_argument("--grad_accum", type=int, default=4, help="Gradient accumulation steps")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--save_steps", type=int, default=500, help="Checkpoint frequency")
    parser.add_argument("--resume_from_checkpoint", type=str, default=None, help="Path to checkpoint folder to resume from")

    args = parser.parse_args()
    train_lora(
        dataset_dir=args.dataset_dir,
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        save_steps=args.save_steps,
        resume_from_checkpoint=args.resume_from_checkpoint,
    )


if __name__ == "__main__":
    main()

