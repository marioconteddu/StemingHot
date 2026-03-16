from pydantic import BaseModel, Field
from typing import Any, Literal, Optional
from enum import Enum


class StemConfig(str, Enum):
    TWO = "2stems"
    FOUR = "4stems"
    FIVE = "5stems"


class QualityMode(str, Enum):
    STABLE_LOCAL = "stable-local"
    MAX_QUALITY = "max-quality"
    CUSTOM = "custom"


class JobStatus(str, Enum):
    UPLOADED = "uploaded"
    SEPARATING = "separating"
    COMPLETED = "completed"
    FAILED = "failed"


class AudioMetadata(BaseModel):
    filename: str
    title: str
    duration: float
    sampleRate: int
    channels: int
    format: str
    bpm: Optional[float] = None
    musicalKey: Optional[str] = None
    thumbnail: Optional[str] = None


class JobEvent(BaseModel):
    timestamp: float
    level: str = "info"
    stage: str
    message: str
    detail: Optional[str] = None
    data: dict[str, Any] = Field(default_factory=dict)


class JobDiagnostics(BaseModel):
    requestId: str
    device: Optional[str] = None
    modelName: Optional[str] = None
    stemConfig: Optional[StemConfig] = None
    qualityMode: Optional[QualityMode] = None
    settings: Optional[dict[str, Any]] = None
    inputPath: Optional[str] = None
    outputPaths: dict[str, str] = Field(default_factory=dict)
    events: list[JobEvent] = Field(default_factory=list)


class StemInfo(BaseModel):
    name: str
    displayName: str
    color: str
    url: str


class JobInfo(BaseModel):
    jobId: str
    status: JobStatus
    progress: float = 0.0
    metadata: Optional[AudioMetadata] = None
    stems: Optional[list[StemInfo]] = None
    error: Optional[str] = None
    stage: str = ""
    diagnostics: Optional[JobDiagnostics] = None


class SeparateRequest(BaseModel):
    jobId: str
    stemConfig: StemConfig
    qualityMode: QualityMode = QualityMode.STABLE_LOCAL
    settings: Optional["AdvancedSettings"] = None


class AdvancedSettings(BaseModel):
    segment: float = 7.8
    overlap: float = 0.25
    shifts: int = 0
    precision: Literal["float32", "float16"] = "float32"


class UrlDownloadRequest(BaseModel):
    url: str


class UrlMetadata(BaseModel):
    title: str
    duration: float
    thumbnail: Optional[str] = None
    url: str


class ProgressMessage(BaseModel):
    jobId: str
    status: JobStatus
    progress: float
    stage: str
    detail: Optional[str] = None
    event: Optional[JobEvent] = None
