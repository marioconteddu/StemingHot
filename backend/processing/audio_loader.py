import torch
import torchaudio
import soundfile as sf
import numpy as np
from pathlib import Path
from typing import Tuple


def _select_backend():
    """Pick the best available torchaudio backend."""
    try:
        backends = torchaudio.list_audio_backends()
    except AttributeError:
        backends = []
    for name in ("ffmpeg", "sox", "soundfile"):
        if name in backends:
            return name
    return None


def load_audio(path: Path, target_sr: int = 44100) -> Tuple[torch.Tensor, int]:
    """
    Load any supported audio format into a torch tensor.
    Returns (waveform, sample_rate) where waveform is shape (channels, samples).
    Resamples to target_sr if needed.
    Uses soundfile as primary loader with ffmpeg fallback.
    """
    try:
        data, sr = sf.read(str(path), dtype="float32", always_2d=True)
        wav = torch.from_numpy(data.T)  # (channels, samples)
    except Exception:
        backend = _select_backend()
        kwargs = {"backend": backend} if backend else {}
        wav, sr = torchaudio.load(str(path), **kwargs)

    if wav.shape[0] > 2:
        wav = wav[:2]

    if wav.shape[0] == 1:
        wav = wav.expand(2, -1)

    if sr != target_sr:
        wav = torchaudio.functional.resample(wav, sr, target_sr)
        sr = target_sr

    return wav, sr


def save_audio(
    wav: torch.Tensor,
    path: Path,
    sample_rate: int = 44100,
    format: str = "wav",
):
    """Save a waveform tensor to file. Uses soundfile for WAV/FLAC, ffmpeg for MP3."""
    data = wav.cpu().numpy().T  # (samples, channels)

    if format == "wav":
        sf.write(str(path), data, sample_rate, subtype="PCM_16")
    elif format == "flac":
        sf.write(str(path), data, sample_rate, format="FLAC")
    elif format == "mp3":
        import lameenc
        pcm_16 = (np.clip(data, -1.0, 1.0) * 32767).astype(np.int16)
        channels = pcm_16.shape[1] if pcm_16.ndim > 1 else 1
        encoder = lameenc.Encoder()
        encoder.set_bit_rate(320)
        encoder.set_in_sample_rate(sample_rate)
        encoder.set_channels(channels)
        encoder.set_quality(0)
        mp3_data = encoder.encode(pcm_16.tobytes())
        mp3_data += encoder.flush()
        with open(path, "wb") as f:
            f.write(mp3_data)
    else:
        sf.write(str(path), data, sample_rate)
