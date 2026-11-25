r"""
Uploads the healthy Bedroom LoRA weights (checkpoint-500) to AWS S3 so the Modal
Serverless GPU worker can download them on cold start without committing weights to Git.

Usage:
    cd d:\LatentCraft\server
    .\.venv_gpu\Scripts\python.exe scripts\sync_lora_to_s3.py
"""

import os
from pathlib import Path
import boto3
from botocore.config import Config
from dotenv import load_dotenv

SERVER_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(SERVER_ROOT / ".env", override=False)

LORA_SOURCE = SERVER_ROOT / "outputs" / "sd15_bedroom_lora" / "checkpoint-500" / "adapter_model.safetensors"
TARGET_KEY = os.getenv("LORA_S3_KEY", "models/bedroom_lora.safetensors").strip()


def main():
    if not LORA_SOURCE.exists():
        raise FileNotFoundError(f"Healthy LoRA weights not found at {LORA_SOURCE}")

    bucket = os.environ["S3_BUCKET_NAME"].strip()
    region = os.getenv("S3_REGION", "ap-southeast-2").strip()
    s3 = boto3.client(
        "s3",
        aws_access_key_id=os.environ["S3_ACCESS_KEY_ID"].strip(),
        aws_secret_access_key=os.environ["S3_SECRET_ACCESS_KEY"].strip(),
        region_name=region,
        config=Config(signature_version="s3v4"),
    )

    print(f"Uploading {LORA_SOURCE.name} ({LORA_SOURCE.stat().st_size / 1e6:.2f} MB) -> s3://{bucket}/{TARGET_KEY}...")
    s3.upload_file(str(LORA_SOURCE), bucket, TARGET_KEY)
    print("Upload complete!")


if __name__ == "__main__":
    main()
