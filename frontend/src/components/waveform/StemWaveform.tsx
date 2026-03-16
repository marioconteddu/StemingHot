import React, { useRef, useCallback, useEffect } from "react";
import { useWavesurfer } from "@wavesurfer/react";
import type { StemInfo } from "../../api/types.ts";
import { useAppStore } from "../../store/appStore.ts";
import { Volume2, VolumeX } from "lucide-react";

interface Props {
  stem: StemInfo;
  onSeek?: (time: number) => void;
}

export const StemWaveform: React.FC<Props> = ({ stem, onSeek }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const currentTime = useAppStore((s) => s.currentTime);
  const stemState = useAppStore((s) => s.stemStates[stem.name]);
  const toggleMute = useAppStore((s) => s.toggleMute);
  const toggleSolo = useAppStore((s) => s.toggleSolo);
  const setVolume = useAppStore((s) => s.setVolume);

  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    url: stem.url,
    waveColor: stem.color + "66",
    progressColor: stem.color,
    cursorColor: "#f59e0b",
    cursorWidth: 2,
    height: 60,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    interact: true,
    backend: "WebAudio",
  });

  useEffect(() => {
    if (!wavesurfer) return;
    wavesurfer.setMuted(true);

    const handleClick = () => {
      const time = wavesurfer.getCurrentTime();
      onSeek?.(time);
    };
    wavesurfer.on("click", handleClick);
    return () => {
      wavesurfer.un("click", handleClick);
    };
  }, [wavesurfer, onSeek]);

  useEffect(() => {
    if (!wavesurfer) return;
    const duration = wavesurfer.getDuration();
    if (duration > 0 && !isNaN(currentTime)) {
      const progress = currentTime / duration;
      if (progress >= 0 && progress <= 1) {
        wavesurfer.seekTo(progress);
      }
    }
  }, [wavesurfer, currentTime]);

  if (!stemState) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-36 shrink-0 rounded-lg border border-border bg-bg-surface/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: stem.color }}
          />
          <span
            className="min-w-0 text-xs font-semibold truncate"
            style={{ color: stem.color }}
          >
            {stem.displayName}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleMute(stem.name)}
            className={`px-2 py-0.5 text-[10px] rounded font-bold transition-colors cursor-pointer ${
              stemState.muted
                ? "bg-danger text-white"
                : "bg-bg-hover text-text-secondary hover:text-text-primary"
            }`}
            title={`Mute ${stem.displayName}`}
          >
            M
          </button>
          <button
            type="button"
            onClick={() => toggleSolo(stem.name)}
            className={`px-2 py-0.5 text-[10px] rounded font-bold transition-colors cursor-pointer ${
              stemState.soloed
                ? "bg-accent text-bg-primary"
                : "bg-bg-hover text-text-secondary hover:text-text-primary"
            }`}
            title={`Solo ${stem.displayName}`}
          >
            S
          </button>
          {stemState.muted ? (
            <VolumeX className="ml-auto h-3.5 w-3.5 text-text-muted" />
          ) : (
            <Volume2 className="ml-auto h-3.5 w-3.5 text-text-secondary" />
          )}
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={stemState.volume}
          onChange={(e) => setVolume(stem.name, parseFloat(e.target.value))}
          className="mt-2 w-full"
          title={`${stem.displayName} volume`}
        />
      </div>
      <div
        ref={containerRef}
        className="flex-1 rounded-md overflow-hidden bg-bg-primary/50"
      />
    </div>
  );
};
