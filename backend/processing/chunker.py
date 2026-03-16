import torch
from typing import Callable, Optional

from processing.post_processing import apply_crossfade


def chunk_and_process(
    audio: torch.Tensor,
    process_fn: Callable[[torch.Tensor], dict[str, torch.Tensor]],
    segment_seconds: float = 39.0,
    sample_rate: int = 44100,
    overlap: float = 0.25,
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> dict[str, torch.Tensor]:
    """
    Process long audio in chunks with overlap-add reconstruction.
    Used as an alternative to the built-in Demucs chunking for
    memory-constrained environments or custom pipelines.

    Args:
        audio: (channels, samples) input
        process_fn: function that takes a chunk and returns {stem_name: chunk_tensor}
        segment_seconds: chunk duration
        sample_rate: audio sample rate
        overlap: fraction of overlap between chunks
        progress_callback: optional progress reporter
    """
    total_samples = audio.shape[-1]
    segment_samples = int(segment_seconds * sample_rate)
    overlap_samples = int(segment_samples * overlap)
    step = segment_samples - overlap_samples

    if total_samples <= segment_samples:
        return process_fn(audio)

    chunks_start = list(range(0, total_samples, step))
    if chunks_start[-1] + segment_samples > total_samples:
        chunks_start[-1] = max(0, total_samples - segment_samples)

    accumulated: dict[str, list[torch.Tensor]] = {}
    n_chunks = len(chunks_start)

    for idx, start in enumerate(chunks_start):
        end = min(start + segment_samples, total_samples)
        chunk = audio[..., start:end]

        if progress_callback:
            progress_callback(
                idx / n_chunks,
                f"Processing chunk {idx + 1}/{n_chunks}",
            )

        result = process_fn(chunk)

        for stem_name, stem_chunk in result.items():
            if stem_name not in accumulated:
                accumulated[stem_name] = []
            accumulated[stem_name].append(stem_chunk)

    if progress_callback:
        progress_callback(0.95, "Reconstructing from chunks...")

    final: dict[str, torch.Tensor] = {}
    for stem_name, chunks in accumulated.items():
        if len(chunks) == 1:
            final[stem_name] = chunks[0]
            continue

        combined = chunks[0]
        for i in range(1, len(chunks)):
            combined = apply_crossfade(combined, chunks[i], overlap_samples)

        final[stem_name] = combined[..., :total_samples]

    return final
