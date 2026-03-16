import torch
import torchaudio
from typing import Callable, Optional

from models.base import ModelInterface


class Demucs6sWrapper(ModelInterface):
    """
    Wrapper for HTDemucs 6-source model.
    Produces 6 stems: drums, bass, other, vocals, guitar, piano.
    """

    def __init__(self, model_name: str = "htdemucs_6s"):
        self.model_name = model_name
        self._model = None
        self._device = "cpu"
        self._stems = ["drums", "bass", "other", "vocals", "guitar", "piano"]

    def load(self, device: str = "cpu"):
        from demucs.pretrained import get_model

        self._device = device
        self._model = get_model(self.model_name)
        self._model.to(device)
        self._model.eval()
        self._stems = list(self._model.sources)

    def is_loaded(self) -> bool:
        return self._model is not None

    def supported_stems(self) -> list[str]:
        return list(self._stems)

    def required_sample_rate(self) -> int:
        if self._model:
            return self._model.samplerate
        return 44100

    def max_segment_seconds(self) -> Optional[float]:
        if not self._model:
            return None
        value = getattr(self._model, "max_allowed_segment", None)
        if value is None:
            value = getattr(self._model, "segment", None)
        return float(value) if value is not None else None

    def separate(
        self,
        audio: torch.Tensor,
        sample_rate: int,
        progress_callback: Optional[Callable[[float, str], None]] = None,
        **kwargs,
    ) -> dict[str, torch.Tensor]:
        from demucs.apply import apply_model

        if not self.is_loaded():
            raise RuntimeError("Model not loaded. Call load() first.")

        model = self._model
        device = self._device

        target_sr = self.required_sample_rate()
        if sample_rate != target_sr:
            audio = torchaudio.functional.resample(audio, sample_rate, target_sr)

        ref = audio.mean(0)
        audio_norm = (audio - ref.mean()) / (ref.std() + 1e-8)

        overlap = kwargs.get("overlap", 0.25)
        shifts = kwargs.get("shifts", 0)
        segment = kwargs.get("segment", None)

        if progress_callback:
            progress_callback(0.05, "Running 6-source model inference...")

        apply_kwargs = dict(
            device=device,
            shifts=shifts,
            split=True,
            overlap=overlap,
            progress=True,
        )
        if segment is not None:
            apply_kwargs["segment"] = segment

        with torch.no_grad():
            sources = apply_model(
                model,
                audio_norm[None],
                **apply_kwargs,
            )[0]

        sources = sources * ref.std() + ref.mean()

        if progress_callback:
            progress_callback(0.9, "Finalizing stems...")

        result = {}
        for i, name in enumerate(model.sources):
            result[name] = sources[i].cpu()

        if device != "cpu" and torch.cuda.is_available():
            torch.cuda.empty_cache()

        return result

    def unload(self):
        self._model = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
