import torch
from typing import Optional

from models.base import ModelInterface
from models.demucs_wrapper import DemucsWrapper
from models.demucs6s_wrapper import Demucs6sWrapper
from api.schemas import StemConfig


STEM_DISPLAY_NAMES = {
    "vocals": "Vocals",
    "drums": "Drums",
    "bass": "Bass",
    "other": "Other",
    "piano": "Piano",
    "guitar": "Guitar",
    "instrumental": "Instrumental",
}

STEM_COLORS = {
    "vocals": "#06b6d4",
    "drums": "#f97316",
    "bass": "#a855f7",
    "other": "#6b7280",
    "piano": "#22c55e",
    "guitar": "#ec4899",
    "instrumental": "#6b7280",
}


class ModelRegistry:
    """
    Registry that maps stem configurations to the appropriate model.
    Handles lazy loading and caching of model instances.
    """

    def __init__(self):
        self._models: dict[str, ModelInterface] = {}
        self._device = self._detect_device()

    def _detect_device(self) -> str:
        if torch.cuda.is_available():
            return "cuda"
        return "cpu"

    @property
    def device(self) -> str:
        return self._device

    def get_model_for_config(self, config: StemConfig) -> ModelInterface:
        if config in (StemConfig.TWO, StemConfig.FOUR):
            return self._get_or_create("htdemucs_ft", DemucsWrapper)
        elif config == StemConfig.FIVE:
            return self._get_or_create("htdemucs_6s", Demucs6sWrapper)
        else:
            return self._get_or_create("htdemucs_ft", DemucsWrapper)

    def _get_or_create(
        self, key: str, factory: type[ModelInterface]
    ) -> ModelInterface:
        if key not in self._models:
            model = factory(model_name=key)
            model.load(self._device)
            self._models[key] = model
        return self._models[key]

    def get_output_stems(self, config: StemConfig) -> list[str]:
        """Get the list of stem names that will be produced for a config."""
        if config == StemConfig.TWO:
            return ["vocals", "instrumental"]
        elif config == StemConfig.FOUR:
            return ["vocals", "drums", "bass", "other"]
        elif config == StemConfig.FIVE:
            return ["vocals", "drums", "bass", "piano", "other"]
        return ["vocals", "drums", "bass", "other"]

    def unload_all(self):
        for model in self._models.values():
            model.unload()
        self._models.clear()
