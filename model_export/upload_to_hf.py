"""
Upload the fine-tuned LoRA package to Hugging Face Model Hub.
Usage:
    python upload_to_hf.py --repo_id your-username/latentcraft-sd15-bedroom-lora --token YOUR_HF_TOKEN
"""

import argparse
from pathlib import Path
from huggingface_hub import HfApi, create_repo


def upload(repo_id: str, token: str):
    export_dir = Path(__file__).parent
    print(f"Creating / verifying repository: {repo_id}...")
    api = HfApi(token=token)
    create_repo(repo_id=repo_id, token=token, repo_type="model", exist_ok=True)

    print(f"Uploading export package from {export_dir}...")
    api.upload_folder(
        folder_path=str(export_dir),
        repo_id=repo_id,
        repo_type="model",
        token=token,
        ignore_patterns=["upload_to_hf.py", "__pycache__/*"],
    )
    print(f"\nUpload complete! View your model at: https://huggingface.co/{repo_id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Upload LatentCraft Bedroom LoRA to Hugging Face")
    parser.add_argument("--repo_id", type=str, required=True, help="HF Repo ID: username/model-name")
    parser.add_argument("--token", type=str, required=True, help="Your Hugging Face write token")
    args = parser.parse_args()
    upload(args.repo_id, args.token)

