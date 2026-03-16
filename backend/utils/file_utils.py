import shutil
from pathlib import Path


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def cleanup_dir(path: Path):
    if path.exists():
        shutil.rmtree(path, ignore_errors=True)


def safe_filename(name: str) -> str:
    """Strip unsafe characters from filenames."""
    keep = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-. ")
    cleaned = "".join(c if c in keep else "_" for c in name)
    return cleaned.strip().rstrip(".")
