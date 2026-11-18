import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, BigInteger, DateTime, Text, ForeignKey, Index
from models.user import Base

class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    batch_id = Column(String(64), nullable=False, index=True)
    model_name = Column(String(100), nullable=False, index=True)
    sampler_name = Column(String(50), nullable=False, index=True)
    steps = Column(Integer, nullable=False, index=True)
    latency_sec = Column(Float, nullable=False)
    throughput_ips = Column(Float, nullable=False, default=0.0)
    fid_score = Column(Float, nullable=False)
    seed = Column(BigInteger, nullable=False, default=42)
    prompt = Column(Text, nullable=False)
    image_url = Column(String(512), nullable=False)
    peak_vram_mb = Column(Float, nullable=False, default=0.0)
    device_name = Column(String(100), nullable=False, default="GPU")
    status = Column(String(20), nullable=False, default="COMPLETED", index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

