import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
import bcrypt
import jwt
from core.auth_config import auth_settings

def get_password_hash(password: str) -> str:
    """Hashes a password with bcrypt (work factor 12 standard, UTF-8 safe truncated to 72 bytes)."""
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored bcrypt hash."""
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token containing claims."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": now
    })
    encoded_jwt = jwt.encode(to_encode, auth_settings.JWT_SECRET_KEY, algorithm=auth_settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT access token signature and expiration."""
    return jwt.decode(token, auth_settings.JWT_SECRET_KEY, algorithms=[auth_settings.JWT_ALGORITHM])

def generate_refresh_token() -> Tuple[str, str, datetime]:
    """
    Generates a cryptographically secure opaque refresh token string,
    its SHA-256 hash for database storage, and the expiration timestamp.
    """
    raw_token = secrets.token_urlsafe(64)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(days=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return raw_token, token_hash, expires_at

def hash_refresh_token(raw_token: str) -> str:
    """Hashes an incoming raw refresh token for database lookup."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
