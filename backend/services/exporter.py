import zipfile
from pathlib import Path
from typing import Optional

import numpy as np
import soundfile as sf
import lameenc

from processing.audio_loader import load_audio, save_audio


def _encode_mp3(source_path: Path, output_path: Path, sample_rate: int = 44100):
    """Encode audio to MP3 using lameenc (no ffmpeg needed)."""
    data, sr = sf.read(str(source_path), dtype="float32", always_2d=True)

    pcm_16 = (np.clip(data, -1.0, 1.0) * 32767).astype(np.int16)

    channels = pcm_16.shape[1]
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(320)
    encoder.set_in_sample_rate(sr)
    encoder.set_channels(channels)
    encoder.set_quality(0)

    mp3_data = encoder.encode(pcm_16.tobytes())
    mp3_data += encoder.flush()

    with open(output_path, "wb") as f:
        f.write(mp3_data)


def export_stem(
    source_path: Path,
    output_path: Path,
    format: str = "wav",
    sample_rate: int = 44100,
):
    """Convert a stem file to the requested format."""
    if format == "wav" and source_path.suffix == ".wav":
        import shutil
        shutil.copy2(source_path, output_path)
        return

    if format in ("wav", "flac"):
        wav, sr = load_audio(source_path, target_sr=sample_rate)
        save_audio(wav, output_path, sample_rate, format)
    elif format == "mp3":
        _encode_mp3(source_path, output_path, sample_rate)
    else:
        raise ValueError(f"Unsupported export format: {format}")


def export_all_stems_zip(
    stem_paths: dict[str, Path],
    output_path: Path,
    format: str = "wav",
    track_name: str = "track",
    name_map: Optional[dict[str, str]] = None,
    sample_rate: int = 44100,
):
    """Export all stems into a zip archive."""
    temp_dir = output_path.parent / "export_temp"
    temp_dir.mkdir(exist_ok=True)

    try:
        with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for stem_name, source_path in stem_paths.items():
                display_name = stem_name
                if name_map and stem_name in name_map:
                    display_name = name_map[stem_name]

                ext = format if format != "mp3" else "mp3"
                out_name = f"{track_name}_{display_name}.{ext}"
                out_path = temp_dir / out_name

                export_stem(source_path, out_path, format, sample_rate)
                zf.write(out_path, out_name)
    finally:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
