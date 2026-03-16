import asyncio
import time
import traceback
import logging
import torch
from pathlib import Path
from typing import Optional

from models.registry import ModelRegistry, STEM_COLORS, STEM_DISPLAY_NAMES
from processing.audio_loader import load_audio, save_audio
from processing.post_processing import normalize_stems
from api.schemas import StemConfig, StemInfo, JobStatus
from services.job_manager import JobManager

logger = logging.getLogger(__name__)

class Separator:
    """Orchestrates the full separation pipeline."""

    def __init__(self, registry: ModelRegistry, job_manager: JobManager):
        self.registry = registry
        self.job_manager = job_manager

    @staticmethod
    def _resolve_runtime_shifts(
        requested_shifts: int,
        device: str,
        track_duration_seconds: float,
    ) -> tuple[int, Optional[str]]:
        """
        Clamp random shifts based on the device and track duration.
        This keeps Max Quality usable for short/normal tracks without
        turning long jobs into impractical runs.
        """
        requested = max(0, int(requested_shifts))
        if requested == 0:
            return 0, None

        if device == "cuda":
            if track_duration_seconds <= 10 * 60:
                applied = min(requested, 2)
            elif track_duration_seconds <= 20 * 60:
                applied = min(requested, 1)
            else:
                applied = 0
        else:
            if track_duration_seconds <= 8 * 60:
                applied = min(requested, 1)
            else:
                applied = 0

        if applied == requested:
            return applied, None

        if applied == 0:
            return (
                0,
                f"Requested random shifts were disabled for {device} on a "
                f"{track_duration_seconds / 60:.1f} minute track.",
            )

        return (
            applied,
            f"Requested random shifts were clamped from {requested} to {applied} "
            f"for {device} on a {track_duration_seconds / 60:.1f} minute track.",
        )

    @staticmethod
    def _format_duration(seconds: float) -> str:
        total_seconds = max(0, int(round(seconds)))
        minutes, secs = divmod(total_seconds, 60)
        hours, minutes = divmod(minutes, 60)
        if hours:
            return f"{hours}h {minutes}m"
        if minutes:
            return f"{minutes}m {secs}s"
        return f"{secs}s"

    @staticmethod
    def _estimate_inference_runtime_seconds(
        track_duration_seconds: float,
        device: str,
        stem_config: StemConfig,
        overlap: float,
        shifts: int,
    ) -> float:
        base_factor = 0.34 if device == "cuda" else 1.15
        config_factor = 1.15 if stem_config == StemConfig.FIVE else 1.0
        overlap_factor = 1.0 + max(0.0, overlap - 0.25) * 1.2
        shifts_factor = 1.0 + max(0, shifts) * 0.35
        minimum_runtime = 35.0 if device == "cuda" else 75.0

        estimate = (
            track_duration_seconds
            * base_factor
            * config_factor
            * overlap_factor
            * shifts_factor
        )
        return max(minimum_runtime, estimate)

    async def _heartbeat(
        self,
        job_id: str,
        done_event: asyncio.Event,
        expected_runtime_seconds: float,
    ):
        """
        Keep inference progress moving with a duration-aware estimate so the
        UI does not appear stalled until finalization.
        """
        start = time.monotonic()
        while not done_event.is_set():
            elapsed = time.monotonic() - start
            expected = max(expected_runtime_seconds, 1.0)
            progress_floor = 18.0
            progress_target = 86.0
            progress_cap = 92.0

            if elapsed <= expected:
                progress_ratio = elapsed / expected
                progress = progress_floor + (
                    (progress_target - progress_floor) * progress_ratio
                )
                remaining = self._format_duration(max(0.0, expected - elapsed))
                timing_hint = f"~{remaining} left"
            else:
                overflow = elapsed - expected
                overflow_window = max(expected * 0.35, 30.0)
                progress = progress_target + (
                    (progress_cap - progress_target)
                    * (1 - 1 / (1 + overflow / overflow_window))
                )
                timing_hint = "finishing up"

            elapsed_str = self._format_duration(elapsed)
            await self.job_manager.update_progress(
                job_id,
                progress,
                f"Running AI separation... {elapsed_str} elapsed · {timing_hint}",
            )
            await asyncio.sleep(2)

    async def run(
        self,
        job_id: str,
        stem_config: StemConfig,
        segment: Optional[float] = None,
        overlap: float = 0.25,
        shifts: int = 0,
    ):
        """
        Execute the full separation pipeline in a background thread.
        Updates job progress via the job_manager.
        """
        job = self.job_manager.get_job(job_id)
        if not job or not job.audio_path:
            await self.job_manager.update_progress(
                job_id, 0, "Error: no audio file", JobStatus.FAILED,
                detail="No audio file found for this job.",
                level="error",
            )
            return

        try:
            await self.job_manager.update_progress(
                job_id, 5, "Loading audio...", JobStatus.SEPARATING,
                data={"audioPath": str(job.audio_path)},
            )

            audio, sr = await asyncio.to_thread(
                load_audio, job.audio_path
            )
            track_duration_seconds = float(audio.shape[-1]) / float(sr)
            self.job_manager.add_event(
                job_id,
                stage="audio-loaded",
                message="Audio loaded",
                data={
                    "sampleRate": sr,
                    "channels": int(audio.shape[0]),
                    "samples": int(audio.shape[-1]),
                    "durationSeconds": round(track_duration_seconds, 3),
                },
            )

            await self.job_manager.update_progress(
                job_id, 10, "Loading model (first run downloads ~320 MB)...",
                data={"stemConfig": stem_config},
            )

            model = await asyncio.to_thread(
                self.registry.get_model_for_config, stem_config
            )
            model_name = getattr(model, "model_name", model.__class__.__name__)
            effective_shifts, shifts_adjustment_detail = self._resolve_runtime_shifts(
                shifts,
                self.registry.device,
                track_duration_seconds,
            )
            max_segment = model.max_segment_seconds()
            requested_segment = segment if segment is not None else max_segment
            effective_segment = requested_segment
            if max_segment is not None:
                if requested_segment is None:
                    effective_segment = max_segment
                else:
                    effective_segment = min(requested_segment, max_segment)
            self.job_manager.update_diagnostics(
                job_id,
                device=self.registry.device,
                modelName=model_name,
                stemConfig=stem_config,
                settings={
                    "trackDurationSeconds": round(track_duration_seconds, 3),
                    "requestedSegment": segment,
                    "appliedSegment": effective_segment,
                    "maxSegment": max_segment,
                    "overlap": overlap,
                    "requestedShifts": shifts,
                    "appliedShifts": effective_shifts,
                },
            )
            self.job_manager.add_event(
                job_id,
                stage="model-loaded",
                message="Model loaded",
                data={
                    "modelName": model_name,
                    "device": self.registry.device,
                    "requiredSampleRate": model.required_sample_rate(),
                },
            )

            if shifts_adjustment_detail:
                self.job_manager.add_event(
                    job_id,
                    stage="settings-adjusted",
                    message=(
                        "Random shifts adjusted for runtime safety"
                        if effective_shifts
                        else "Random shifts disabled for runtime safety"
                    ),
                    level="warning",
                    detail=shifts_adjustment_detail,
                    data={"requestedShifts": shifts, "appliedShifts": effective_shifts},
                )
            if (
                max_segment is not None
                and requested_segment is not None
                and requested_segment > max_segment
            ):
                self.job_manager.add_event(
                    job_id,
                    stage="settings-adjusted",
                    message="Segment length clamped to model-safe maximum",
                    level="warning",
                    detail=(
                        f"Requested segment {requested_segment}s exceeded model limit "
                        f"{max_segment}s; runtime used {effective_segment}s."
                    ),
                    data={
                        "requestedSegment": requested_segment,
                        "maxSegment": max_segment,
                        "appliedSegment": effective_segment,
                    },
                )

            await self.job_manager.update_progress(
                job_id, 15, "Separating stems...",
                data={
                    "requestedSegment": segment,
                    "appliedSegment": effective_segment,
                    "maxSegment": max_segment,
                    "overlap": overlap,
                    "requestedShifts": shifts,
                    "appliedShifts": effective_shifts,
                },
            )

            kwargs = {"overlap": overlap, "shifts": effective_shifts}
            if effective_segment is not None:
                kwargs["segment"] = effective_segment

            expected_inference_runtime = self._estimate_inference_runtime_seconds(
                track_duration_seconds,
                self.registry.device,
                stem_config,
                overlap,
                effective_shifts,
            )
            self.job_manager.update_diagnostics(
                job_id,
                settings={
                    **(job.diagnostics.settings or {}),
                    "estimatedInferenceSeconds": round(expected_inference_runtime, 3),
                },
            )

            # Run inference and heartbeat concurrently
            done_event = asyncio.Event()
            heartbeat_task = asyncio.create_task(
                self._heartbeat(job_id, done_event, expected_inference_runtime)
            )

            try:
                inference_started_at = time.monotonic()
                raw_stems = await asyncio.to_thread(
                    model.separate, audio, sr, None, **kwargs
                )
            finally:
                done_event.set()
                await heartbeat_task
            inference_elapsed = round(time.monotonic() - inference_started_at, 3)
            self.job_manager.add_event(
                job_id,
                stage="inference-complete",
                message="Model inference complete",
                data={
                    "elapsedSeconds": inference_elapsed,
                    "producedStems": sorted(list(raw_stems.keys())),
                },
            )

            await self.job_manager.update_progress(
                job_id, 90, "Post-processing...",
                data={"stems": sorted(list(raw_stems.keys()))},
            )

            raw_stems = normalize_stems(raw_stems)

            output_stems = self.registry.get_output_stems(stem_config)
            if stem_config == StemConfig.TWO:
                non_vocal = [
                    v for k, v in raw_stems.items() if k != "vocals"
                ]
                if non_vocal:
                    instrumental = torch.stack(non_vocal).sum(dim=0)
                    raw_stems = {
                        "vocals": raw_stems["vocals"],
                        "instrumental": instrumental,
                    }

            if stem_config == StemConfig.FIVE and "guitar" in raw_stems:
                if "other" in raw_stems:
                    raw_stems["other"] = raw_stems["other"] + raw_stems["guitar"]
                del raw_stems["guitar"]

            stems_to_save = [stem_name for stem_name in output_stems if stem_name in raw_stems]
            await self.job_manager.update_progress(
                job_id,
                92,
                f"Saving stems... (0/{len(stems_to_save)})",
                data={"outputStemNames": stems_to_save},
            )

            job_dir = self.job_manager.get_job_dir(job_id)
            stems_dir = job_dir / "stems"
            stems_dir.mkdir(exist_ok=True)

            target_sr = model.required_sample_rate()
            stem_infos = []

            total_stems_to_save = max(len(stems_to_save), 1)
            for stem_index, stem_name in enumerate(stems_to_save, start=1):
                stem_path = stems_dir / f"{stem_name}.wav"
                await asyncio.to_thread(
                    save_audio, raw_stems[stem_name], stem_path, target_sr
                )

                job.stem_paths[stem_name] = stem_path
                job.diagnostics.outputPaths[stem_name] = str(stem_path)
                stem_infos.append(
                    StemInfo(
                        name=stem_name,
                        displayName=STEM_DISPLAY_NAMES.get(stem_name, stem_name.title()),
                        color=STEM_COLORS.get(stem_name, "#6b7280"),
                        url=f"/api/stems/{job_id}/{stem_name}",
                    )
                )
                self.job_manager.add_event(
                    job_id,
                    stage="stem-saved",
                    message="Stem written to disk",
                    data={"stemName": stem_name, "path": str(stem_path)},
                )
                save_progress = 92 + (7 * stem_index / total_stems_to_save)
                await self.job_manager.update_progress(
                    job_id,
                    save_progress,
                    f"Saving stems... ({stem_index}/{total_stems_to_save})",
                    data={"savedStem": stem_name, "savedCount": stem_index},
                )

            job.stems = stem_infos
            job.status = JobStatus.COMPLETED

            await self.job_manager.update_progress(
                job_id, 100, "Complete", JobStatus.COMPLETED,
                data={"savedStems": [stem.name for stem in stem_infos]},
            )

        except Exception as e:
            logger.exception("Separation failed for job %s", job_id)
            traceback.print_exc()
            await self.job_manager.update_progress(
                job_id, 0, "Separation failed", JobStatus.FAILED,
                detail=str(e),
                level="error",
                data={
                    "exceptionType": e.__class__.__name__,
                    "audioPath": str(job.audio_path) if job and job.audio_path else None,
                    "stemConfig": stem_config,
                },
            )
