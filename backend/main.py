import tempfile
import logging
from pathlib import Path

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from api.auth import auth_enabled, get_bearer_token, verify_token

# Force torchaudio to use soundfile backend (avoids torchcodec requirement in 2.10+)
import torchaudio
try:
    backends = torchaudio.list_audio_backends()
    for _backend in ("ffmpeg", "soundfile", "sox"):
        if _backend in backends:
            torchaudio.set_audio_backend(_backend)
            break
except Exception:
    pass

from api.routes import router, init_routes
from api.websocket import progress_websocket
from models.registry import ModelRegistry
from services.job_manager import JobManager
from processing.separator import Separator

WORK_DIR = Path(tempfile.gettempdir()) / "steminghot_jobs"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

app = FastAPI(title="StemingHot", version="1.0.0")

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if not path.startswith("/api/"):
            return await call_next(request)
        if path == "/api/health" or path == "/api/auth/login":
            return await call_next(request)
        if not auth_enabled():
            return await call_next(request)
        token = get_bearer_token(request) or request.query_params.get("token")
        if not token or not verify_token(token):
            return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
        return await call_next(request)


app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

registry = ModelRegistry()
job_manager = JobManager(WORK_DIR)
separator = Separator(registry, job_manager)

init_routes(job_manager, separator, registry)
app.include_router(router)


@app.websocket("/ws/progress/{job_id}")
async def ws_progress(websocket: WebSocket, job_id: str):
    if auth_enabled():
        token = websocket.query_params.get("token")
        if not token or not verify_token(token):
            await websocket.close(code=4001, reason="Not authenticated")
            return
    await progress_websocket(websocket, job_id, job_manager)


@app.on_event("shutdown")
async def shutdown():
    registry.unload_all()
