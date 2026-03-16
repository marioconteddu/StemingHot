import React from "react";
import { FileAudio, Clock, Activity } from "lucide-react";
import type { AudioMetadata } from "../../api/types.ts";

interface Props {
  metadata: AudioMetadata;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileInfo: React.FC<Props> = ({ metadata }) => (
  <div className="bg-bg-surface rounded-lg p-3 space-y-2">
    <div className="flex items-center gap-2">
      <FileAudio className="w-4 h-4 text-accent shrink-0" />
      <span className="text-sm text-text-primary font-medium truncate">
        {metadata.title || metadata.filename}
      </span>
    </div>
    <div className="flex gap-4 text-xs text-text-secondary">
      <span className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {formatDuration(metadata.duration)}
      </span>
      <span className="flex items-center gap-1">
        <Activity className="w-3 h-3" />
        {(metadata.sampleRate / 1000).toFixed(1)} kHz
      </span>
      <span className="uppercase">{metadata.format}</span>
    </div>
  </div>
);
