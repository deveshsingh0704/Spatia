import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, BigInteger, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from models.user import Base


class Generation(Base):
    __tablename__ = "generations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False, default="Untitled Architectural Mockup")
    image_url = Column(String(512), nullable=False)
    storage_key = Column(String(255), nullable=False)

    # Core Diffusion Conditioning Parameters
    prompt = Column(Text, nullable=False)
    negative_prompt = Column(Text, nullable=True)
    seed = Column(BigInteger, nullable=False, index=True)
    model_name = Column(String(100), nullable=False, index=True)
    sampler_name = Column(String(50), nullable=False, index=True)
    steps = Column(Integer, nullable=False)
    guidance_scale = Column(Float, nullable=False)
    resolution = Column(String(20), nullable=False, default="512x512")
    width = Column(Integer, nullable=False, default=512)
    height = Column(Integer, nullable=False, default=512)

    # Telemetry
    latency_sec = Column(Float, nullable=False, default=0.0)
    peak_vram_mb = Column(Float, nullable=False, default=0.0)

    # User Flags
    is_favorite = Column(Boolean, nullable=False, default=False, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    library_associations = relationship("LibraryItem", back_populates="generation", cascade="all, delete-orphan")


class Library(Base):
    __tablename__ = "libraries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    cover_image_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    items = relationship("LibraryItem", back_populates="library", cascade="all, delete-orphan")


class LibraryItem(Base):
    __tablename__ = "library_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    library_id = Column(String(36), ForeignKey("libraries.id", ondelete="CASCADE"), nullable=False, index=True)
    generation_id = Column(String(36), ForeignKey("generations.id", ondelete="CASCADE"), nullable=False, index=True)
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    library = relationship("Library", back_populates="items")
    generation = relationship("Generation", back_populates="library_associations")

