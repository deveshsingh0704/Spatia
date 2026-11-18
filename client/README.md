# LatentCraft Client

Modern Next.js 14 + Tailwind CSS + Lucide frontend for LatentCraft, providing an interactive design studio, real-time diffusion progress tracking via SSE, side-by-side fine-tuned model evaluation, and hardware telemetry displays.

---

## 🚀 Prerequisites

- **Node.js**: `>= 18.17.0`
- **Package Manager**: `npm`, `pnpm`, or `yarn`
- **Backend API**: LatentCraft FastAPI server running on `http://localhost:8001`

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
cd client
npm install
# or
pnpm install
```

### 2. Run the Development Server
```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with hot-reloading on port 3000 |
| `npm run build` | Builds the optimized production application |
| `npm run start` | Starts the production Next.js server |
| `npm run lint` | Runs ESLint to inspect and enforce code formatting standards |

---

## 🎨 Key Features & Pages

- **`/studio` (Design Studio)**: Interactive text-to-image generator with model selection (**SD 1.5 Fine-Tuned** vs. **Base SD 1.5**), mathematical sampler picker (DDIM / DDPM), step count sliders, and live SSE streaming progress bar.
- **Side-by-Side Quality Showcase**: Embedded directly inside `/studio` to showcase architectural fidelity and lighting improvements from our fine-tuned LSUN bedroom LoRA.
- **`/benchmark`**: Comprehensive charts and telemetry tables comparing step latency, VRAM footprint, and convergence rates.
- **`/gallery`**: Pre-rendered architectural environment mockups and history.
- **`/login` & `/signup`**: JWT-based mock authentication flow.

---

## 🔗 Connecting to the Backend

By default, the client makes API calls to:
```
http://localhost:8001
```
Ensure the backend is running via `.\.venv_gpu\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload` inside the `server/` directory.
