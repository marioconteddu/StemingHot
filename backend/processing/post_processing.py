import torch


def normalize_stems(
    stems: dict[str, torch.Tensor],
    peak_level: float = 0.95,
) -> dict[str, torch.Tensor]:
    """
    Normalize each stem to avoid clipping while preserving
    relative levels between stems.
    """
    max_peak = 0.0
    for wav in stems.values():
        peak = wav.abs().max().item()
        max_peak = max(max_peak, peak)

    if max_peak > peak_level:
        scale = peak_level / max_peak
        stems = {k: v * scale for k, v in stems.items()}

    return stems


def apply_crossfade(
    chunk_a: torch.Tensor,
    chunk_b: torch.Tensor,
    overlap_samples: int,
) -> torch.Tensor:
    """
    Apply raised-cosine crossfade between two overlapping chunks.
    Returns the combined result.
    """
    if overlap_samples <= 0:
        return torch.cat([chunk_a, chunk_b], dim=-1)

    fade_out = torch.linspace(1, 0, overlap_samples)
    fade_in = torch.linspace(0, 1, overlap_samples)

    if chunk_a.dim() == 2:
        fade_out = fade_out.unsqueeze(0)
        fade_in = fade_in.unsqueeze(0)

    overlap_a = chunk_a[..., -overlap_samples:] * fade_out
    overlap_b = chunk_b[..., :overlap_samples] * fade_in
    blended = overlap_a + overlap_b

    return torch.cat(
        [chunk_a[..., :-overlap_samples], blended, chunk_b[..., overlap_samples:]],
        dim=-1,
    )
