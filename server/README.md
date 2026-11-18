# LatentCraft Server

FastAPI diffusion inference backend engine supporting **Stable Diffusion v1.5** (Base) and custom **Fine-Tuned SD 1.5 (LSUN Bedroom LoRA)** with real-time SSE progress streaming.

---

## 🚀 Prerequisites

- **Python**: `>= 3.10` (CUDA environment located in `server/.venv_gpu`)
- **GPU**: NVIDIA GPU with CUDA support (e.g. RTX 4050 6GB Laptop GPU)
- **Package Manager**: `uv` or `pip`

---

## 🛠️ Running the FastAPI Backend

### Option 1: Using the GPU Virtual Environment (Recommended for Inference)
```powershell
# Navigate to the server folder
cd d:\LatentCraft\server

# Launch Uvicorn with the dedicated GPU environment (Port 8001)
.\.venv_gpu\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Option 2: Using `uv`
```powershell
cd d:\LatentCraft\server
uv run uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

- **Interactive API Docs (Swagger UI)**: `http://localhost:8001/docs`
- **Health Check Endpoint**: `http://localhost:8001/health`
- **Model Benchmark Data**: `http://localhost:8001/api/benchmark`
- **Diffusion Generation API**: `POST http://localhost:8001/api/generate`

---

## 🧪 Model & Evaluation Scripts

All auxiliary evaluation and benchmark scripts can be executed directly from `server/`:

### 1. Visual Quality Comparison (Base SD 1.5 vs. Fine-Tuned Bedroom LoRA)
Generates side-by-side comparison grids for 3 distinct interior bedroom prompts:
```powershell
.\.venv_gpu\Scripts\python.exe compare_sd15_models.py
```
*Output images saved to: `outputs/comparisons/`*

### 2. Multi-Model Sampler Benchmark Suite
Executes the matrix benchmark across DDIM vs. DDPM:
```powershell
.\.venv_gpu\Scripts\python.exe core/benchmark.py
```
*Results logged to: `outputs/experiments/experiment_results.csv`*

---

## 📂 Server Directory Structure
```
server/
├── api/                    # API route controllers
├── core/                   # Core ML logic (config, model_manager, samplers, benchmark)
├── dataset/                # Dataset directory (contains sampled 2k LSUN images)
├── outputs/
│   ├── comparisons/        # Base vs LoRA side-by-side evaluation grids
│   ├── generated/          # Runtime generation outputs
│   └── sd15_bedroom_lora/  # Trained LoRA checkpoints & final .safetensors
├── compare_sd15_models.py  # Script for generating quality comparisons
├── main.py                 # FastAPI application entrypoint
└── pyproject.toml          # Project dependencies & metadata
```
