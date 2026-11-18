from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.auth_config import auth_settings
from core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from models.user import User, RefreshToken, get_db
from api.deps import get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# Schemas
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = "user"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 900

class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 900


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    existing = await db.execute(select(User).where(User.email == req.email.lower()))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
    
    if len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )

    # Create user
    hashed_pwd = get_password_hash(req.password)
    user = User(
        email=req.email.lower(),
        password_hash=hashed_pwd,
        role=req.role if req.role in ["user", "researcher", "admin"] else "user",
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Issue tokens
    access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })
    raw_refresh, token_hash, expires_at = generate_refresh_token()
    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        revoked=False
    )
    db.add(db_refresh)
    await db.commit()

    # Set HttpOnly Cookie
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        samesite=auth_settings.COOKIE_SAMESITE,
        secure=auth_settings.COOKIE_SECURE,
        max_age=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
        token_type="bearer",
        expires_in=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == req.email.lower())
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )

    # Issue access token
    access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })

    # Issue & persist refresh token
    raw_refresh, token_hash, expires_at = generate_refresh_token()
    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        revoked=False
    )
    db.add(db_refresh)
    await db.commit()

    # Set HttpOnly Cookie
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        samesite=auth_settings.COOKIE_SAMESITE,
        secure=auth_settings.COOKIE_SECURE,
        max_age=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    print(f"[AUTH] user: logged in ({user.email})")

    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
        token_type="bearer",
        expires_in=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    body: Optional[RefreshRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    # Extract token from cookie or body fallback
    raw_token = request.cookies.get("refresh_token")
    if not raw_token and body and body.refresh_token:
        raw_token = body.refresh_token

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token"
        )

    token_hash = hash_refresh_token(raw_token)
    stmt = select(RefreshToken).where(
        RefreshToken.token_hash == token_hash
    )
    result = await db.execute(stmt)
    token_record = result.scalars().first()

    if not token_record or token_record.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or expired"
        )

    # Fetch user
    user_stmt = select(User).where(User.id == token_record.user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or disabled"
        )

    # Generate new access token
    new_access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })

    # If the token is near expiration (< 2 days remaining), rotate it; otherwise keep existing cookie
    # This prevents race conditions during page reloads where multiple concurrent requests invalidate each other
    time_left = (token_record.expires_at - datetime.utcnow()).total_seconds()
    if time_left < 2 * 86400:
        token_record.revoked = True
        new_raw_refresh, new_token_hash, new_expires_at = generate_refresh_token()
        new_db_refresh = RefreshToken(
            user_id=user.id,
            token_hash=new_token_hash,
            expires_at=new_expires_at,
            revoked=False
        )
        db.add(new_db_refresh)
        await db.commit()

        response.set_cookie(
            key="refresh_token",
            value=new_raw_refresh,
            httponly=True,
            samesite=auth_settings.COOKIE_SAMESITE,
            secure=auth_settings.COOKIE_SECURE,
            max_age=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            path="/"
        )

    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    raw_token = request.cookies.get("refresh_token")
    if raw_token:
        token_hash = hash_refresh_token(raw_token)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        result = await db.execute(stmt)
        token_record = result.scalars().first()
        if token_record:
            token_record.revoked = True
            await db.commit()

    response.delete_cookie(key="refresh_token", path="/")
    print(f"[AUTH] user: logged out ({current_user.email})")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
