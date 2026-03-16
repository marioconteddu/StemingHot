# StemingHot - Music Stem Separation Studio

A professional-grade local web application for music stem separation, built for music producers and audio engineers. Uses state-of-the-art Hybrid Transformer Demucs (HTDemucs) models for maximum separation quality.

## Features

- **High-quality stem separation** using HTDemucs fine-tuned models (9.0+ dB SDR)
- **Multiple stem configurations**: 2-stem (vocals/instrumental), 4-stem (vocals/drums/bass/other), 5-stem (+ piano)
- **Professional studio UI** with dark theme, stacked waveform timeline, and stem mixer
- **Per-stem controls**: mute, solo, volume, individual download
- **Drag-and-drop upload** supporting WAV, MP3, FLAC, AIFF, M4A, AAC, OGG
- **URL audio download** via yt-dlp (YouTube and 1000+ sites)
- **Export** to WAV, FLAC, or MP3 with custom naming
- **Real-time progress** via WebSocket during separation
- **Persistent diagnostics** with job timeline, request ID, backend detail, and transport state in the UI
- **Chunked inference** for long tracks without memory issues
- **Model abstraction layer** for easy future model swaps

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **FFmpeg** (ffmpeg and ffprobe) — required for **URL fetch** (paste link + Fetch). The backend looks for it in this order: (1) env `FFMPEG_LOCATION` or `FFMPEG_PATH`, (2) system PATH, (3) project folder `backend/tools/ffmpeg` (or `backend/ffmpeg`) containing the binaries. [Download Windows builds](https://www.gyan.dev/ffmpeg/builds/) (e.g. ffmpeg-release-essentials.zip), unzip, and either add the `bin` folder to PATH or copy it to `backend/tools/ffmpeg`.
- **CUDA-capable GPU** recommended (CPU fallback supported, but slow)
- ~2 GB disk space for model weights (auto-downloaded on first run)

## Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**PyTorch with CUDA** (recommended for GPU acceleration):

```bash
# Install PyTorch with CUDA support (adjust CUDA version as needed)
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### Frontend

```bash
cd frontend
npm install
```

## Running

### Start the backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

On first run, Demucs model weights (~800 MB for htdemucs_ft) will be automatically downloaded.

### Start the frontend

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

The Vite dev server proxies `/api` and `/ws` requests to the backend on port 8000.

## Optional login

A simple login page protects the app when credentials are set. To enable:

1. Set environment variables before starting the backend:
   - `STEMINGHOT_USER` — username to log in with
   - `STEMINGHOT_PASSWORD` — password
   - (optional) `STEMINGHOT_JWT_SECRET` — secret for signing tokens; defaults to the password

2. Restart the backend. The app will show the login screen first; after signing in, all API and WebSocket requests use the issued token.

If these variables are **not** set, the app still shows the login screen but accepts any username/password and continues without real auth (suitable for local-only use).

## Usage

1. **Upload** a track via drag-and-drop, file picker, or paste a URL
2. **Choose** a stem configuration (2, 4, or 5 stems)
3. **Click "Separate Stems"** and watch real-time progress
4. **Preview** stems in the waveform timeline and mixer
5. **Adjust** levels with mute/solo/volume per stem
6. **Export** individual stems or download all as a zip

## Architecture

```
backend/
  main.py              FastAPI entry point
  api/
    routes.py          REST endpoints
    websocket.py       Progress WebSocket
    schemas.py         Pydantic models
  processing/
    audio_loader.py    Audio I/O (any format -> tensor)
    chunker.py         Overlap-add chunked inference
    separator.py       Separation pipeline orchestrator
    post_processing.py Crossfade, normalization
  models/
    base.py            Abstract ModelInterface
    demucs_wrapper.py  HTDemucs 4-stem wrapper
    demucs6s_wrapper.py HTDemucs 6-stem wrapper
    registry.py        Model registry + config mapping
  services/
    job_manager.py     In-memory job state + progress
    url_downloader.py  yt-dlp integration
    exporter.py        Format conversion + zip
  utils/
    audio_utils.py     FFprobe metadata
    file_utils.py      Temp file management

frontend/
  src/
    api/               API client + types
    components/
      layout/          3-panel studio layout
      upload/          Upload zone, URL input
      waveform/        Stacked waveform timeline
      mixer/           Per-stem mixer controls
      export/          Export panel
      settings/        Advanced settings
      common/          Shared UI components
    hooks/             Audio player, WebSocket, separation
    store/             Zustand state management
```

## Models

### HTDemucs Fine-tuned (htdemucs_ft)
- **Stems**: drums, bass, other, vocals
- **Quality**: 9.00 dB SDR on MUSDB HQ
- **Used for**: 2-stem and 4-stem configurations

### HTDemucs 6-Source (htdemucs_6s)
- **Stems**: drums, bass, other, vocals, guitar, piano
- **Quality**: Experimental, piano/guitar quality is lower
- **Used for**: 5-stem configuration

### Adding New Models

1. Create a new wrapper class in `backend/models/` implementing `ModelInterface`
2. Register it in `backend/models/registry.py`
3. The frontend requires no changes

## Advanced Settings

Available in the collapsible panel:

| Setting | Default | Description |
|---------|---------|-------------|
| Segment Length | 39s | Duration of each processing chunk |
| Overlap | 0.25 | Overlap ratio between chunks |
| Random Shifts | 0 | Currently forced to 0 for runtime stability in the local Demucs pipeline |
| Precision | float32 | Model precision (float16 for speed) |

## Improving Separation Quality

- **Use GPU**: CUDA acceleration is significantly faster and allows larger segments
- **Input quality**: Higher quality inputs produce better separations
- **Fine-tuned model**: `htdemucs_ft` is already the best available variant
- **Future models**: The `ModelInterface` abstraction supports swapping in BSRNN, BandIt, or other models as they become available

## Debugging & Verification

- Backend readiness: `http://localhost:8000/api/health`
- Failed jobs now expose request ID, stage history, backend detail, and transport detail in the frontend diagnostics panel
- Repo-contained smoke fixture: `fixtures/audio/smoke_test.wav`

### Automated checks

```bash
# Backend observability/API tests
cd backend
venv\Scripts\activate
python -m pytest

# Frontend store diagnostics test
cd ../frontend
npm run test:unit

# Real browser E2E against the actual app flow
npm run test:e2e

# Run the full local verification suite
cd ..
backend\venv\Scripts\python.exe scripts\run_debug_suite.py
```

## Development Notes

- The architecture is intentionally modular for rapid iteration with AI coding tools
- Each module has clear input/output contracts
- The model layer is abstracted so new separation models can be integrated without touching the UI
- Temporary files are stored in the system temp directory under `steminghot_jobs/`
- No persistent database; all state is in-memory and resets on restart
- The frontend uses Zustand for simple, debuggable state management
- Waveform rendering uses wavesurfer.js v7 with the React wrapper

## Documentation

- **[StemingHot Technical White Paper](docs/WHITEPAPER.md)** — Purpose, architecture, features, technology stack, user workflow, and design decisions.
- **[Terms and Conditions](docs/TERMS_AND_CONDITIONS.md)** — Terms of use, acceptable use, intellectual property, disclaimer, and contact.

## License

Private personal tool. Not intended for commercial distribution.
