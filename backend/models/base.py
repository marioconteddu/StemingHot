from abc import ABC, abstractmethod
from typing import Callable, Optional
import torch


class ModelInterface(ABC):
    """Abstract base for all stem separation models."""

    @abstractmethod
    def load(self, device: str = "cpu"):
        """Load model weights into memory."""
        ...

    @abstractmethod
    def separate(
        self,
        audio: torch.Tensor,
        sample_rate: int,
        progress_callback: Optional[Callable[[float, str], None]] = None,
        **kwargs,
    ) -> dict[str, torch.Tensor]:
        """
        Separate audio into stems.
        Args:
            audio: (channels, samples) tensor
            sample_rate: input sample rate
            progress_callback: fn(progress_0_to_1, stage_description)
        Returns:
            dict mapping stem name to (channels, samples) tensor
        """
        ...

    @abstractmethod
    def supported_stems(self) -> list[str]:
        """List of stem names this model can produce."""
        ...

    @abstractmethod
    def required_sample_rate(self) -> int:
        """Sample rate the model expects."""
        ...

    @abstractmethod
    def is_loaded(self) -> bool:
        ...

    def max_segment_seconds(self) -> Optional[float]:
        """Maximum safe segment length for chunked inference, if known."""
        return None

    def unload(self):
        """Release model from memory."""
        pass
