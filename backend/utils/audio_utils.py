import subprocess
import json
from pathlib import Path
from typing import Optional

KEY_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
MAJOR_KEY_PROFILE = (
    6.35,
    2.23,
    3.48,
    2.33,
    4.38,
    4.09,
    2.52,
    5.19,
    2.39,
    3.66,
    2.29,
    2.88,
)
MINOR_KEY_PROFILE = (
    6.33,
    2.68,
    3.52,
    5.38,
    2.6,
    3.53,
    2.54,
    4.75,
    3.98,
    2.69,
    3.34,
    3.17,
)


def _estimate_musical_key(chroma_mean) -> Optional[str]:
    import numpy as np

    if chroma_mean.size != 12 or not np.any(chroma_mean):
        return None

    normalized_chroma = chroma_mean / np.linalg.norm(chroma_mean)
    best_score = float("-inf")
    best_key: Optional[str] = None

    for index, key_name in enumerate(KEY_NAMES):
        major_profile = np.roll(np.array(MAJOR_KEY_PROFILE, dtype=float), index)
        major_profile /= np.linalg.norm(major_profile)
        major_score = float(np.dot(normalized_chroma, major_profile))
        if major_score > best_score:
            best_score = major_score
            best_key = f"{key_name} major"

        minor_profile = np.roll(np.array(MINOR_KEY_PROFILE, dtype=float), index)
        minor_profile /= np.linalg.norm(minor_profile)
        minor_score = float(np.dot(normalized_chroma, minor_profile))
        if minor_score > best_score:
            best_score = minor_score
            best_key = f"{key_name} minor"

    return best_key


def analyze_musical_metadata(path: Path) -> dict:
    """Estimate BPM and musical key from a short preview of the track."""
    try:
        import librosa
        import numpy as np

        preview_duration = 120
        audio, sample_rate = librosa.load(
            path,
            sr=22050,
            mono=True,
            duration=preview_duration,
        )
        if audio.size == 0:
            return {"bpm": None, "musicalKey": None}

        onset_envelope = librosa.onset.onset_strength(y=audio, sr=sample_rate)
        tempo_values = librosa.feature.tempo(
            onset_envelope=onset_envelope,
            sr=sample_rate,
            aggregate=None,
        )
        bpm: Optional[float] = None
        if tempo_values.size:
            bpm_value = float(np.median(tempo_values))
            if np.isfinite(bpm_value):
                bpm = round(bpm_value, 1)

        chroma = librosa.feature.chroma_cqt(y=audio, sr=sample_rate)
        musical_key = None
        if chroma.size:
            chroma_mean = np.mean(chroma, axis=1)
            musical_key = _estimate_musical_key(chroma_mean)

        return {"bpm": bpm, "musicalKey": musical_key}
    except Exception:
        return {"bpm": None, "musicalKey": None}


def _read_metadata_with_ffprobe(path: Path) -> dict:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(path),
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    info = json.loads(result.stdout)
    fmt = info.get("format", {})
    streams = info.get("streams", [])
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), {})

    return {
        "duration": float(fmt.get("duration", 0)),
        "sampleRate": int(audio_stream.get("sample_rate", 44100)),
        "channels": int(audio_stream.get("channels", 2)),
    }


def _read_metadata_with_soundfile(path: Path) -> dict:
    import soundfile as sf

    info = sf.info(str(path))
    duration = 0.0
    if info.samplerate:
        duration = float(info.frames) / float(info.samplerate)

    return {
        "duration": duration,
        "sampleRate": int(info.samplerate or 44100),
        "channels": int(info.channels or 2),
    }


def get_audio_metadata(path: Path) -> dict:
    """Extract audio metadata with ffprobe when available, then fall back to Python readers."""
    metadata = {
        "duration": 0.0,
        "sampleRate": 44100,
        "channels": 2,
        "format": path.suffix.lstrip(".").lower(),
    }

    try:
        metadata.update(_read_metadata_with_ffprobe(path))
    except Exception:
        pass

    if metadata["duration"] <= 0:
        try:
            metadata.update(_read_metadata_with_soundfile(path))
        except Exception:
            pass

    metadata.update(analyze_musical_metadata(path))
    return metadata


def detect_format(path: Path) -> str:
    return path.suffix.lstrip(".").lower()
