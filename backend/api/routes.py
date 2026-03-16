import asyncio
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from api.auth import (
    LoginRequest,
    LoginResponse,
    auth_enabled,
    create_token,
    verify_credentials,
)
from api.schemas import (
    AdvancedSettings,
    JobInfo,
    QualityMode,
    SeparateRequest,
    UrlDownloadRequest,
    UrlMetadata,
    AudioMetadata,
    JobStatus,
)
from services.job_manager import JobManager
from services.url_downloader import extract_url_metadata, download_audio_from_url
from services.exporter import export_stem, export_all_stems_zip
from processing.separator import Separator
from models.registry import ModelRegistry
from utils.audio_utils import get_audio_metadata
from utils.file_utils import safe_filename
router = APIRouter(prefix="/api")

_job_manager: JobManager = None  # type: ignore
_separator: Separator = None  # type: ignore
_registry: ModelRegistry = None  # type: ignore

QUALITY_MODE_PRESETS: dict[QualityMode, AdvancedSettings] = {
    QualityMode.STABLE_LOCAL: AdvancedSettings(),
    QualityMode.MAX_QUALITY: AdvancedSettings(overlap=0.5, shifts=2, precision="float32"),
}


def init_routes(job_manager: JobManager, separator: Separator, registry: ModelRegistry):
    global _job_manager, _separator, _registry
    _job_manager = job_manager
    _separator = separator
    _registry = registry


@router.post("/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    if not auth_enabled():
        # No credentials configured: allow through with a placeholder token (middleware does not check)
        return LoginResponse(token="no-auth")
    if not verify_credentials(req.username, req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    return LoginResponse(token=create_token(req.username))


def resolve_quality_settings(req: SeparateRequest) -> AdvancedSettings:
    if req.qualityMode == QualityMode.CUSTOM:
        return req.settings or AdvancedSettings()

    preset = QUALITY_MODE_PRESETS.get(req.qualityMode, QUALITY_MODE_PRESETS[QualityMode.STABLE_LOCAL])
    return preset.model_copy(deep=True)


@router.post("/upload", response_model=JobInfo)
async def upload_file(file: UploadFile = File(...)):
    job = _job_manager.create_job()
    job_dir = _job_manager.get_job_dir(job.job_id)

    filename = safe_filename(file.filename or "audio.wav")
    audio_path = job_dir / filename

    with open(audio_path, "wb") as f:
        while chunk := await file.read(8192):
            f.write(chunk)

    job.audio_path = audio_path
    meta = get_audio_metadata(audio_path)

    job.metadata = AudioMetadata(
        filename=filename,
        title=Path(filename).stem,
        duration=meta["duration"],
        sampleRate=meta["sampleRate"],
        channels=meta["channels"],
        format=meta["format"],
        bpm=meta.get("bpm"),
        musicalKey=meta.get("musicalKey"),
    )
    _job_manager.update_diagnostics(
        job.job_id,
        inputPath=str(audio_path),
    )
    _job_manager.add_event(
        job.job_id,
        stage="upload-complete",
        message="File uploaded",
        data={
            "filename": filename,
            "duration": meta["duration"],
            "sampleRate": meta["sampleRate"],
            "channels": meta["channels"],
            "format": meta["format"],
            "bpm": meta.get("bpm"),
            "musicalKey": meta.get("musicalKey"),
        },
    )

    return JobInfo(
        jobId=job.job_id,
        status=job.status,
        metadata=job.metadata,
        stage=job.stage,
        diagnostics=job.diagnostics,
    )


@router.post("/url/metadata", response_model=UrlMetadata)
async def get_url_metadata(req: UrlDownloadRequest):
    try:
        info = await asyncio.to_thread(extract_url_metadata, req.url)
        return UrlMetadata(**info)
    except Exception as e:
        detail = str(e)
        if "ffprobe" in detail.lower() and "ffmpeg" in detail.lower() and "not found" in detail.lower():
            detail += " Install FFmpeg (ffmpeg.org), add it to PATH, or set env FFMPEG_LOCATION."
        raise HTTPException(status_code=400, detail=detail)


@router.post("/url/download", response_model=JobInfo)
async def download_from_url(req: UrlDownloadRequest):
    job = _job_manager.create_job()
    job_dir = _job_manager.get_job_dir(job.job_id)
    _job_manager.add_event(
        job.job_id,
        stage="url-download-start",
        message="Downloading source from URL",
        data={"url": req.url},
    )

    try:
        result = await asyncio.to_thread(
            download_audio_from_url, req.url, job_dir
        )

        job.audio_path = result.path
        meta = get_audio_metadata(result.path)

        job.metadata = AudioMetadata(
            filename=result.path.name,
            title=result.title,
            duration=result.duration or meta["duration"],
            sampleRate=meta["sampleRate"],
            channels=meta["channels"],
            format=meta["format"],
            bpm=meta.get("bpm"),
            musicalKey=meta.get("musicalKey"),
            thumbnail=result.thumbnail,
        )
        _job_manager.update_diagnostics(
            job.job_id,
            inputPath=str(result.path),
        )
        _job_manager.add_event(
            job.job_id,
            stage="url-download-complete",
            message="URL download complete",
            data={
                "url": req.url,
                "title": result.title,
                "path": str(result.path),
                "duration": result.duration or meta["duration"],
                "bpm": meta.get("bpm"),
                "musicalKey": meta.get("musicalKey"),
            },
        )

        return JobInfo(
            jobId=job.job_id,
            status=job.status,
            metadata=job.metadata,
            stage=job.stage,
            diagnostics=job.diagnostics,
        )
    except Exception as e:
        detail = str(e)
        if "ffprobe" in detail.lower() and "ffmpeg" in detail.lower() and "not found" in detail.lower():
            detail += " Install FFmpeg (ffmpeg.org), add it to your PATH, or set env FFMPEG_LOCATION to the folder containing ffmpeg and ffprobe."
        _job_manager.add_event(
            job.job_id,
            stage="url-download-failed",
            message="URL download failed",
            level="error",
            detail=detail,
            data={"url": req.url},
        )
        raise HTTPException(status_code=400, detail=detail)


@router.post("/separate", response_model=JobInfo)
async def separate_audio(req: SeparateRequest):
    job = _job_manager.get_job(req.jobId)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    settings = resolve_quality_settings(req)
    kwargs = {}
    kwargs["segment"] = settings.segment
    kwargs["overlap"] = settings.overlap
    kwargs["shifts"] = settings.shifts

    model_name = "htdemucs_ft"
    if req.stemConfig == "5stems":
        model_name = "htdemucs_6s"

    _job_manager.update_diagnostics(
        job.job_id,
        device=_registry.device,
        modelName=model_name,
        stemConfig=req.stemConfig,
        qualityMode=req.qualityMode,
        settings=settings.model_dump(),
        inputPath=str(job.audio_path) if job.audio_path else None,
    )
    _job_manager.add_event(
        job.job_id,
        stage="separation-requested",
        message="Separation requested",
        data={
            "stemConfig": req.stemConfig,
            "qualityMode": req.qualityMode,
            "device": _registry.device,
            "modelName": model_name,
            "settings": settings.model_dump(),
        },
    )

    asyncio.create_task(
        _separator.run(
            job_id=req.jobId,
            stem_config=req.stemConfig,
            **kwargs,
        )
    )

    job.status = JobStatus.SEPARATING
    return JobInfo(
        jobId=job.job_id,
        status=job.status,
        progress=0,
        metadata=job.metadata,
        stage=job.stage,
        diagnostics=job.diagnostics,
    )


@router.get("/job/{job_id}/status", response_model=JobInfo)
async def get_job_status(job_id: str):
    job = _job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.audio_path and job.metadata and (
        job.metadata.duration <= 0
        or job.metadata.bpm is None
        or job.metadata.musicalKey is None
    ):
        refreshed_meta = get_audio_metadata(job.audio_path)
        job.metadata = AudioMetadata(
            filename=job.metadata.filename,
            title=job.metadata.title,
            duration=refreshed_meta["duration"],
            sampleRate=refreshed_meta["sampleRate"],
            channels=refreshed_meta["channels"],
            format=refreshed_meta["format"],
            bpm=refreshed_meta.get("bpm"),
            musicalKey=refreshed_meta.get("musicalKey"),
            thumbnail=job.metadata.thumbnail,
        )

    return JobInfo(
        jobId=job.job_id,
        status=job.status,
        progress=job.progress,
        metadata=job.metadata,
        stems=job.stems if job.status == JobStatus.COMPLETED else None,
        error=job.error,
        stage=job.stage,
        diagnostics=job.diagnostics,
    )


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "device": _registry.device,
        "jobs": len(_job_manager.jobs),
    }


@router.get("/stems/{job_id}/{stem_name}")
async def get_stem_audio(job_id: str, stem_name: str):
    job = _job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    stem_path = job.stem_paths.get(stem_name)
    if not stem_path or not stem_path.exists():
        raise HTTPException(status_code=404, detail="Stem not found")

    return FileResponse(
        path=str(stem_path),
        media_type="audio/wav",
        filename=f"{stem_name}.wav",
    )


@router.get("/export/{job_id}")
async def export_single_stem(job_id: str, format: str = "wav", stem: str = ""):
    job = _job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not stem or stem not in job.stem_paths:
        raise HTTPException(status_code=400, detail="Stem name required")

    source = job.stem_paths[stem]
    job_dir = _job_manager.get_job_dir(job_id)
    out_name = f"{stem}.{format}"
    out_path = job_dir / "exports" / out_name
    out_path.parent.mkdir(exist_ok=True)
    _job_manager.add_event(
        job_id,
        stage="export-start",
        message="Exporting single stem",
        data={"stem": stem, "format": format, "outputPath": str(out_path)},
    )
    try:
        await asyncio.to_thread(export_stem, source, out_path, format)
    except Exception as exc:
        _job_manager.add_event(
            job_id,
            stage="export-failed",
            message="Stem export failed",
            level="error",
            detail=str(exc),
            data={"stem": stem, "format": format},
        )
        raise
    job.diagnostics.outputPaths[f"{stem}.{format}"] = str(out_path)
    _job_manager.add_event(
        job_id,
        stage="export-complete",
        message="Stem export complete",
        data={"stem": stem, "format": format, "outputPath": str(out_path)},
    )

    media_types = {"wav": "audio/wav", "flac": "audio/flac", "mp3": "audio/mpeg"}
    return FileResponse(
        path=str(out_path),
        media_type=media_types.get(format, "application/octet-stream"),
        filename=out_name,
    )


@router.get("/export/{job_id}/all")
async def export_all_stems(job_id: str, format: str = "wav"):
    job = _job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.stem_paths:
        raise HTTPException(status_code=400, detail="No stems available")

    job_dir = _job_manager.get_job_dir(job_id)
    track_name = "track"
    if job.metadata:
        track_name = safe_filename(job.metadata.title or "track")

    zip_path = job_dir / f"{track_name}_stems.zip"
    _job_manager.add_event(
        job_id,
        stage="export-all-start",
        message="Exporting all stems archive",
        data={"format": format, "outputPath": str(zip_path)},
    )
    try:
        await asyncio.to_thread(
            export_all_stems_zip, job.stem_paths, zip_path, format, track_name
        )
    except Exception as exc:
        _job_manager.add_event(
            job_id,
            stage="export-all-failed",
            message="Archive export failed",
            level="error",
            detail=str(exc),
            data={"format": format},
        )
        raise
    job.diagnostics.outputPaths[f"all.{format}.zip"] = str(zip_path)
    _job_manager.add_event(
        job_id,
        stage="export-all-complete",
        message="Archive export complete",
        data={"format": format, "outputPath": str(zip_path)},
    )

    return FileResponse(
        path=str(zip_path),
        media_type="application/zip",
        filename=f"{track_name}_stems.zip",
    )
