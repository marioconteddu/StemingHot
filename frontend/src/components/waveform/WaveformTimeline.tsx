import React from "react";
import { StemWaveform } from "./StemWaveform.tsx";
import { PlaybackControls } from "./PlaybackControls.tsx";
import { useAppStore } from "../../store/appStore.ts";
import { useAudioPlayer } from "../../hooks/useAudioPlayer.ts";

export const WaveformTimeline: React.FC = () => {
  const stems = useAppStore((s) => s.stems);
  const { togglePlayPause, seek } = useAudioPlayer();

  if (stems.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
        Stems will appear here after separation
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {stems.map((stem) => (
          <StemWaveform key={stem.name} stem={stem} onSeek={seek} />
        ))}
      </div>
      <PlaybackControls onTogglePlay={togglePlayPause} onSeek={seek} />
    </div>
  );
};
