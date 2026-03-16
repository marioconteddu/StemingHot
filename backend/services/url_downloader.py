import os
import shutil
import sys
import yt_dlp
from pathlib import Path
from typing import Optional
from dataclasses import dataclass


def _ffmpeg_location() -> Optional[str]:
    """Path to ffmpeg dir or binary: env FFMPEG_LOCATION/FFMPEG_PATH, then PATH, then common dirs."""
    loc = os.environ.get("FFMPEG_LOCATION") or os.environ.get("FFMPEG_PATH")
    if loc:
        return os.path.expanduser(loc.strip())

    # Try PATH
    ffmpeg_exe = shutil.which("ffmpeg")
    if ffmpeg_exe:
        return str(Path(ffmpeg_exe).parent)

    # Project-local: backend/tools/ffmpeg or backend/ffmpeg (must contain ffmpeg and ffprobe)
    _backend_root = Path(__file__).resolve().parent.parent
    for rel in ("tools/ffmpeg", "tools/ffmpeg/bin", "ffmpeg", "ffmpeg/bin"):
        base = _backend_root / rel
        if base.exists():
            ffmpeg_exe = (base / "ffmpeg.exe") if sys.platform == "win32" else (base / "ffmpeg")
            if ffmpeg_exe.exists():
                return str(base)

    # Common Windows install locations
    if sys.platform == "win32":
        for base in (
            Path(os.environ.get("ProgramFiles", "C:\\Program Files")) / "ffmpeg" / "bin",
            Path(os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)")) / "ffmpeg" / "bin",
            Path("C:/ffmpeg/bin"),
            Path(os.path.expanduser("~/ffmpeg/bin")),
        ):
            if base.exists():
                ffmpeg = base / "ffmpeg.exe"
                if ffmpeg.exists():
                    return str(base)

    return None


@dataclass
class DownloadedAudio:
    path: Path
    title: str
    duration: float
    thumbnail: Optional[str]


def _base_ydl_opts() -> dict:
    opts = {
        "quiet": True,
        "no_warnings": True,
    }
    loc = _ffmpeg_location()
    if loc:
        opts["ffmpeg_location"] = loc
    return opts


def extract_url_metadata(url: str) -> dict:
    """Fetch metadata without downloading."""
    opts = {**_base_ydl_opts(), "skip_download": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return {
            "title": info.get("title", "Unknown"),
            "duration": float(info.get("duration", 0)),
            "thumbnail": info.get("thumbnail"),
            "url": url,
        }


def download_audio_from_url(url: str, output_dir: Path) -> DownloadedAudio:
    """Download best quality audio from a URL."""
    output_dir.mkdir(parents=True, exist_ok=True)
    output_template = str(output_dir / "%(title)s.%(ext)s")

    opts = {
        **_base_ydl_opts(),
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
                "preferredquality": "0",
            }
        ],
    }

    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = info.get("title", "downloaded")

        wav_files = list(output_dir.glob("*.wav"))
        if not wav_files:
            all_files = list(output_dir.glob("*"))
            audio_exts = {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".aac"}
            wav_files = [f for f in all_files if f.suffix.lower() in audio_exts]

        if not wav_files:
            raise FileNotFoundError(f"No audio file found after download in {output_dir}")

        return DownloadedAudio(
            path=wav_files[0],
            title=title,
            duration=float(info.get("duration", 0)),
            thumbnail=info.get("thumbnail"),
        )
