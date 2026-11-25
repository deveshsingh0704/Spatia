import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Tuple, Optional, Dict, Any
import json
import boto3
from botocore.exceptions import ClientError
from PIL import Image
from PIL.PngImagePlugin import PngInfo

SERVER_ROOT = Path(__file__).resolve().parent.parent
OUTPUTS_GALLERY_DIR = SERVER_ROOT / "outputs" / "gallery"
OUTPUTS_GALLERY_DIR.mkdir(parents=True, exist_ok=True)


def _build_png_info(metadata: Optional[Dict[str, Any]]) -> Optional[PngInfo]:
    if not metadata:
        return None
    pnginfo = PngInfo()
    for key, val in metadata.items():
        if val is not None:
            pnginfo.add_text(str(key), str(val))
    pnginfo.add_text("latentcraft_metadata", json.dumps(metadata))
    return pnginfo


class BaseStorageService(ABC):
    @abstractmethod
    def save_image(
        self,
        image: Image.Image,
        filename_prefix: str = "gen",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[str, str]:
        """
        Saves a PIL Image (with optional embedded PNG metadata).
        Returns:
            Tuple[image_url, storage_key]
        """
        pass

    @abstractmethod
    def delete_image(self, storage_key: str) -> bool:
        """Deletes an image by its storage key."""
        pass


class LocalStorageService(BaseStorageService):
    """Local filesystem storage serving via FastAPI static file mount."""
    def __init__(self, base_dir: Path = OUTPUTS_GALLERY_DIR, base_url: str = "http://localhost:8001/outputs/gallery"):
        self.base_dir = base_dir
        self.base_url = base_url.rstrip("/")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save_image(
        self,
        image: Image.Image,
        filename_prefix: str = "gen",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[str, str]:
        unique_name = f"{filename_prefix}_{uuid.uuid4().hex[:12]}.png"
        filepath = self.base_dir / unique_name
        pnginfo = _build_png_info(metadata)
        save_kwargs = {"format": "PNG", "optimize": True}
        if pnginfo is not None:
            save_kwargs["pnginfo"] = pnginfo
        image.save(filepath, **save_kwargs)
        image_url = f"{self.base_url}/{unique_name}"
        return image_url, unique_name

    def delete_image(self, storage_key: str) -> bool:
        filepath = self.base_dir / storage_key
        if filepath.exists() and filepath.is_file():
            try:
                filepath.unlink()
                return True
            except Exception as e:
                print(f"[LocalStorageService] Error deleting {filepath}: {e}")
                return False
        return False


class S3CloudStorageService(BaseStorageService):
    """AWS S3 or Cloudflare R2 / MinIO S3-compatible cloud storage."""
    def __init__(
        self,
        bucket_name: str,
        access_key: str,
        secret_key: str,
        region: str = "us-east-1",
        endpoint_url: Optional[str] = None,
        custom_domain: Optional[str] = None
    ):
        self.bucket_name = bucket_name
        self.custom_domain = custom_domain.rstrip("/") if custom_domain else None
        self.endpoint_url = endpoint_url
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            endpoint_url=endpoint_url
        )

    def save_image(
        self,
        image: Image.Image,
        filename_prefix: str = "gen",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[str, str]:
        import io
        buffer = io.BytesIO()
        pnginfo = _build_png_info(metadata)
        save_kwargs = {"format": "PNG", "optimize": True}
        if pnginfo is not None:
            save_kwargs["pnginfo"] = pnginfo
        image.save(buffer, **save_kwargs)
        buffer.seek(0)
        
        storage_key = f"gallery/{filename_prefix}_{uuid.uuid4().hex[:12]}.png"
        self.s3_client.upload_fileobj(
            buffer,
            self.bucket_name,
            storage_key,
            ExtraArgs={"ContentType": "image/png"}
        )

        if self.custom_domain:
            image_url = f"{self.custom_domain}/{storage_key}"
        elif self.endpoint_url:
            image_url = f"{self.endpoint_url.rstrip('/')}/{self.bucket_name}/{storage_key}"
        else:
            image_url = f"https://{self.bucket_name}.s3.amazonaws.com/{storage_key}"

        return image_url, storage_key

    def delete_image(self, storage_key: str) -> bool:
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=storage_key)
            return True
        except ClientError as e:
            print(f"[S3CloudStorageService] Delete error: {e}")
            return False


def get_storage_service() -> BaseStorageService:
    """
    Factory: Checks if Cloud S3/R2 credentials are configured in environment variables.
    If valid credentials are provided, returns S3CloudStorageService;
    otherwise, seamlessly falls back to LocalStorageService.
    """
    bucket = os.getenv("S3_BUCKET_NAME", "").strip()
    access_key = os.getenv("S3_ACCESS_KEY_ID", "").strip()
    secret_key = os.getenv("S3_SECRET_ACCESS_KEY", "").strip()
    endpoint = os.getenv("S3_ENDPOINT_URL", "").strip() or None
    custom_domain = os.getenv("S3_CUSTOM_DOMAIN", "").strip() or None
    region = os.getenv("S3_REGION", "us-east-1").strip()

    if bucket and access_key and secret_key:
        try:
            return S3CloudStorageService(
                bucket_name=bucket,
                access_key=access_key,
                secret_key=secret_key,
                region=region,
                endpoint_url=endpoint,
                custom_domain=custom_domain
            )
        except Exception as e:
            print(f"[Storage Service] Failed to initialize S3 service, falling back to local: {e}")

    return LocalStorageService()

