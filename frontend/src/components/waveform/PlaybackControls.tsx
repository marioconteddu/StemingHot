import React from "react";
import { Play, Pause, SkipBack } from "lucide-react";
import { useAppStore } from "../../store/appStore.ts";

interface Props {
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

export const PlaybackControls: React.FC<Props> = ({
  onTogglePlay,
  onSeek,
}) => {
  const isPlaying = useAppStore((s) => s.isPlaying);
  const currentTime = useAppStore((s) => s.currentTime);
  const duration = useAppStore((s) => s.duration);

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-bg-secondary border-t border-border">
      <button
        onClick={() => onSeek(0)}
        className="p-1.5 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        <SkipBack className="w-4 h-4" />
      </button>
      <button
        onClick={onTogglePlay}
        className="p-2 bg-accent text-bg-primary rounded-full hover:bg-accent-hover
          transition-colors cursor-pointer"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>
      <div className="flex-1 flex items-center gap-3">
        <span className="text-xs font-mono text-text-secondary w-16 text-right">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="flex-1"
        />
        <span className="text-xs font-mono text-text-secondary w-16">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};
