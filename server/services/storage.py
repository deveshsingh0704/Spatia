import os
import uuid
import json
from abc import ABC, abstractmethod
from functools import lru_cache
from pathlib import Path
from typing import Tuple, Optional, Dict, Any
from urllib.parse import urlparse
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from PIL import Image
from PIL.PngImagePlugin import PngInfo

SERVER_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(SERVER_ROOT / ".env", override=False)

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
            Tuple[canonical_image_url, storage_key]
        """
        pass

    @abstractmethod
    def delete_image(self, storage_key: str) -> bool:
        """Deletes an image by its storage key."""
        pass

    def resolve_url(
        self,
        image_url: Optional[str],
        storage_key: Optional[str] = None,
        expires_in: int = 3600,
        download_filename: Optional[str] = None,
    ) -> Optional[str]:
        """Resolves a stored image reference to a browser-accessible URL."""
        return image_url


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
        self.region = region or "us-east-1"
        self.custom_domain = custom_domain.rstrip("/") if custom_domain else None
        self.endpoint_url = endpoint_url
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=self.region,
            endpoint_url=endpoint_url,
            config=Config(signature_version="s3v4")
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
            image_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{storage_key}"

        return image_url, storage_key

    def _extract_s3_key(self, image_url: Optional[str], storage_key: Optional[str]) -> Optional[str]:
        if storage_key and "/" in storage_key:
            return storage_key
        if image_url and self.bucket_name in image_url and ".s3" in image_url:
            parsed = urlparse(image_url)
            return parsed.path.lstrip("/") or None
        return None

    def resolve_url(
        self,
        image_url: Optional[str],
        storage_key: Optional[str] = None,
        expires_in: int = 3600,
        download_filename: Optional[str] = None,
    ) -> Optional[str]:
        if not image_url and not storage_key:
            return image_url

        # Keep legacy local filesystem URLs untouched so existing local items still load
        if image_url and (
            image_url.startswith("http://localhost")
            or image_url.startswith("http://127.0.0.1")
            or image_url.startswith("/")
        ):
            return image_url

        s3_key = self._extract_s3_key(image_url, storage_key)
        if not s3_key:
            return image_url

        if self.custom_domain and not download_filename:
            return f"{self.custom_domain}/{s3_key}"

        try:
            params: Dict[str, Any] = {"Bucket": self.bucket_name, "Key": s3_key}
            if download_filename:
                safe_name = download_filename.replace('"', "")
                params["ResponseContentDisposition"] = f'attachment; filename="{safe_name}"'
            return self.s3_client.generate_presigned_url(
                "get_object",
                Params=params,
                ExpiresIn=expires_in,
            )
        except Exception as e:
            print(f"[S3CloudStorageService] Presign error for {s3_key}: {e}")
            return image_url

    def delete_image(self, storage_key: str) -> bool:
        # Handle legacy local deletion gracefully if object isn't an S3 key
        if storage_key and "/" not in storage_key:
            local_path = OUTPUTS_GALLERY_DIR / storage_key
            if local_path.exists() and local_path.is_file():
                try:
                    local_path.unlink()
                    return True
                except Exception:
                    pass
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=storage_key)
            return True
        except ClientError as e:
            print(f"[S3CloudStorageService] Delete error: {e}")
            return False


@lru_cache(maxsize=1)
def get_storage_service() -> BaseStorageService:
    """
    Factory: Checks if Cloud S3/R2 credentials are configured in environment variables.
    If valid credentials are provided, returns S3CloudStorageService;
    otherwise, seamlessly falls back to LocalStorageService.
    """
    load_dotenv(SERVER_ROOT / ".env", override=False)
    bucket = os.getenv("S3_BUCKET_NAME", "").strip()
    access_key = os.getenv("S3_ACCESS_KEY_ID", "").strip()
    secret_key = os.getenv("S3_SECRET_ACCESS_KEY", "").strip()
    endpoint = os.getenv("S3_ENDPOINT_URL", "").strip() or None
    custom_domain = os.getenv("S3_CUSTOM_DOMAIN", "").strip() or None
    region = os.getenv("S3_REGION", "us-east-1").strip()

    if bucket and access_key and secret_key:
        try:
            service = S3CloudStorageService(
                bucket_name=bucket,
                access_key=access_key,
                secret_key=secret_key,
                region=region,
                endpoint_url=endpoint,
                custom_domain=custom_domain
            )
            print(f"[Storage Service] AWS S3 active: bucket='{bucket}' region='{region}'")
            return service
        except Exception as e:
            print(f"[Storage Service] Failed to initialize S3 service, falling back to local: {e}")

    print("[Storage Service] Using LocalStorageService (server/outputs/gallery/)")
    return LocalStorageService()
