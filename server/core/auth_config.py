import os
from pathlib import Path
from pydantic_settings import BaseSettings

SERVER_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = SERVER_DIR / ".env"

class AuthSettings(BaseSettings):
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "latentcraft_spatial_diffusion_jwt_secret_key_2026_deterministic")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./latentcraft.db")
    COOKIE_SAMESITE: str = "lax"
    COOKIE_SECURE: bool = False  # Set to True in HTTPS production

    class Config:
        env_file = str(ENV_PATH)
        extra = "allow"

auth_settings = AuthSettings()
