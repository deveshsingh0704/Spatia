import uuid
from datetime import datetime
from typing import AsyncGenerator
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from core.auth_config import auth_settings

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="user")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")


# Async Engine & Session Factory with graceful fallback
def create_resilient_engine():
    db_url = auth_settings.DATABASE_URL
    connect_args = {}
    if "sqlite" in db_url:
        connect_args["check_same_thread"] = False
    return create_async_engine(
        db_url,
        echo=False,
        future=True,
        connect_args=connect_args
    )

engine = create_resilient_engine()

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def init_db():
    global engine, AsyncSessionLocal
    try:
        # Use asyncio.wait_for with a 2-second timeout to check postgres reachability
        import asyncio
        async def _check():
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        await asyncio.wait_for(_check(), timeout=2.0)
        print(f"[Database] Successfully connected and initialized: {auth_settings.DATABASE_URL}")
    except Exception as e:
        if "postgresql" in auth_settings.DATABASE_URL:
            print(f"[Database Warning] Could not connect to PostgreSQL ({e}). Falling back to local SQLite...")
            sqlite_url = "sqlite+aiosqlite:///./latentcraft.db"
            engine = create_async_engine(sqlite_url, echo=False, future=True, connect_args={"check_same_thread": False})
            AsyncSessionLocal = sessionmaker(
                bind=engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autocommit=False,
                autoflush=False,
            )
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            print("[Database] Successfully connected to fallback SQLite database.")
        else:
            raise e

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
