from processing.separator import Separator


def test_cuda_short_tracks_allow_max_quality_shifts():
    applied, detail = Separator._resolve_runtime_shifts(2, "cuda", 4 * 60)

    assert applied == 2
    assert detail is None


def test_cuda_medium_tracks_clamp_shifts():
    applied, detail = Separator._resolve_runtime_shifts(2, "cuda", 12 * 60)

    assert applied == 1
    assert detail is not None
    assert "clamped from 2 to 1" in detail


def test_cuda_long_tracks_disable_shifts():
    applied, detail = Separator._resolve_runtime_shifts(2, "cuda", 25 * 60)

    assert applied == 0
    assert detail is not None
    assert "disabled" in detail


def test_cpu_short_tracks_allow_single_shift_only():
    applied, detail = Separator._resolve_runtime_shifts(2, "cpu", 4 * 60)

    assert applied == 1
    assert detail is not None
    assert "clamped from 2 to 1" in detail


def test_cpu_long_tracks_disable_shifts():
    applied, detail = Separator._resolve_runtime_shifts(1, "cpu", 10 * 60)

    assert applied == 0
    assert detail is not None
    assert "disabled" in detail
