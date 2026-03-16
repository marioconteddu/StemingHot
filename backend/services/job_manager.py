import uuid
import asyncio
import time
import logging
from pathlib import Path
from typing import Any, Optional
from dataclasses import dataclass, field

from api.schemas import (
    JobStatus,
    AudioMetadata,
    StemInfo,
    ProgressMessage,
    JobDiagnostics,
    JobEvent,
)

logger = logging.getLogger(__name__)


@dataclass
class Job:
    job_id: str
    request_id: str
    status: JobStatus = JobStatus.UPLOADED
    progress: float = 0.0
    stage: str = ""
    audio_path: Optional[Path] = None
    metadata: Optional[AudioMetadata] = None
    stem_paths: dict[str, Path] = field(default_factory=dict)
    stems: list[StemInfo] = field(default_factory=list)
    error: Optional[str] = None
    diagnostics: JobDiagnostics = field(
        default_factory=lambda: JobDiagnostics(requestId="")
    )
    listeners: list[asyncio.Queue] = field(default_factory=list)


class JobManager:
    """In-memory job state tracker with progress broadcasting."""

    def __init__(self, work_dir: Path):
        self.work_dir = work_dir
        self.jobs: dict[str, Job] = {}
        work_dir.mkdir(parents=True, exist_ok=True)

    def create_job(self) -> Job:
        job_id = uuid.uuid4().hex[:12]
        request_id = uuid.uuid4().hex[:8]
        job_dir = self.work_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        job = Job(
            job_id=job_id,
            request_id=request_id,
            diagnostics=JobDiagnostics(requestId=request_id),
        )
        self.jobs[job_id] = job
        self.add_event(
            job_id,
            stage="job-created",
            message="Job created",
            data={"jobDir": str(job_dir)},
        )
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        return self.jobs.get(job_id)

    def get_job_dir(self, job_id: str) -> Path:
        return self.work_dir / job_id

    def subscribe(self, job_id: str) -> Optional[asyncio.Queue]:
        job = self.get_job(job_id)
        if not job:
            return None
        queue: asyncio.Queue = asyncio.Queue()
        job.listeners.append(queue)
        return queue

    def unsubscribe(self, job_id: str, queue: asyncio.Queue):
        job = self.get_job(job_id)
        if job and queue in job.listeners:
            job.listeners.remove(queue)

    def update_diagnostics(self, job_id: str, **fields: Any):
        job = self.get_job(job_id)
        if not job:
            return
        update = job.diagnostics.model_dump()
        update.update({key: value for key, value in fields.items() if value is not None})
        job.diagnostics = JobDiagnostics(**update)

    def add_event(
        self,
        job_id: str,
        stage: str,
        message: str,
        *,
        level: str = "info",
        detail: Optional[str] = None,
        data: Optional[dict[str, Any]] = None,
    ) -> Optional[JobEvent]:
        job = self.get_job(job_id)
        if not job:
            return None
        event = JobEvent(
            timestamp=time.time(),
            level=level,
            stage=stage,
            message=message,
            detail=detail,
            data=data or {},
        )
        job.diagnostics.events.append(event)
        if detail and level in {"error", "warning"}:
            job.error = detail
        logger.info(
            "job_event job_id=%s request_id=%s stage=%s level=%s message=%s detail=%s data=%s",
            job.job_id,
            job.request_id,
            stage,
            level,
            message,
            detail,
            event.data,
        )
        return event

    async def update_progress(
        self,
        job_id: str,
        progress: float,
        stage: str,
        status: Optional[JobStatus] = None,
        detail: Optional[str] = None,
        *,
        level: str = "info",
        data: Optional[dict[str, Any]] = None,
    ):
        job = self.get_job(job_id)
        if not job:
            return
        job.progress = progress
        job.stage = stage
        if status:
            job.status = status
        if detail:
            job.error = detail

        event = self.add_event(
            job_id,
            stage=stage,
            message=stage,
            level=level,
            detail=detail,
            data=data,
        )

        msg = ProgressMessage(
            jobId=job_id,
            status=job.status,
            progress=progress,
            stage=stage,
            detail=detail,
            event=event,
        )
        for q in job.listeners:
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                pass
