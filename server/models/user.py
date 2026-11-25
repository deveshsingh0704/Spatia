import uuid
from datetime import datetime
from typing import AsyncGenerator, Dict, Any, Tuple
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index, text
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


def _normalize_async_db_url(raw_url: str) -> Tuple[str, Dict[str, Any]]:
    """
    Normalizes Neon / Supabase / Render PostgreSQL URLs for SQLAlchemy + asyncpg.
    Converts postgresql:// -> postgresql+asyncpg:// and translates sslmode/channel_binding
    into asyncpg-compatible connect_args.
    """
    db_url = raw_url.strip()
    connect_args: Dict[str, Any] = {}

    if "sqlite" in db_url:
        connect_args["check_same_thread"] = False
        return db_url, connect_args

    if db_url.startswith("postgres://"):
        db_url = "postgresql+asyncpg://" + db_url[len("postgres://"):]
    elif db_url.startswith("postgresql://"):
        db_url = "postgresql+asyncpg://" + db_url[len("postgresql://"):]

    parsed = urlparse(db_url)
    qs = parse_qs(parsed.query)
    needs_ssl = (
        "neon.tech" in (parsed.hostname or "")
        or qs.get("sslmode", [""])[0] in ("require", "verify-ca", "verify-full")
        or qs.get("ssl", [""])[0] in ("true", "require")
    )
    qs.pop("sslmode", None)
    qs.pop("ssl", None)
    qs.pop("channel_binding", None)

    clean_query = urlencode({k: v[0] for k, v in qs.items()})
    clean_url = urlunparse(parsed._replace(query=clean_query))
    if needs_ssl:
        connect_args["ssl"] = "require"
    return clean_url, connect_args


# Async Engine & Session Factory with graceful fallback
def create_resilient_engine():
    db_url, connect_args = _normalize_async_db_url(auth_settings.DATABASE_URL)
    return create_async_engine(
        db_url,
        echo=False,
        future=True,
        pool_pre_ping=True,
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

def _run_schema_migrations(sync_conn):
    """Safely add new columns to pre-existing tables without dropping data."""
    dialect = sync_conn.dialect.name
    if dialect == "postgresql":
        sync_conn.execute(text(
            "ALTER TABLE generations ADD COLUMN IF NOT EXISTS chat_id VARCHAR(36) "
            "REFERENCES chat_sessions(id) ON DELETE SET NULL"
        ))
        sync_conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_generations_chat_id ON generations (chat_id)"
        ))
    elif dialect == "sqlite":
        cols = [row[1] for row in sync_conn.execute(text("PRAGMA table_info(generations)")).fetchall()]
        if "chat_id" not in cols:
            sync_conn.execute(text("ALTER TABLE generations ADD COLUMN chat_id VARCHAR(36)"))
            sync_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_generations_chat_id ON generations (chat_id)"))


async def init_db():
    global engine, AsyncSessionLocal
    import models.gallery  # noqa: F401 - register ChatSession & Generation before create_all
    try:
        # Allow enough time for serverless Postgres (e.g. Neon) cold-start wake + TLS handshake
        import asyncio
        async def _check():
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                await conn.run_sync(_run_schema_migrations)
        await asyncio.wait_for(_check(), timeout=15.0)
        parsed_db = urlparse(auth_settings.DATABASE_URL)
        db_host = parsed_db.hostname or "unknown-host"
        db_label = "Neon PostgreSQL" if "neon.tech" in db_host else ("PostgreSQL" if "postgres" in auth_settings.DATABASE_URL else "SQLite")
        print(f"[Database] Successfully connected and initialized {db_label} ({db_host}).", flush=True)
    except Exception as e:
        if "postgresql" in auth_settings.DATABASE_URL:
            print(f"[Database Warning] Could not connect to PostgreSQL ({type(e).__name__}: {e}). Falling back to local SQLite...")
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
                await conn.run_sync(_run_schema_migrations)
            print("[Database] Successfully connected to fallback SQLite database.")
        else:
            raise e

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
