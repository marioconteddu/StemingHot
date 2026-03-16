import React from "react";
import { Volume2, VolumeX, Download } from "lucide-react";
import { useAppStore } from "../../store/appStore.ts";
import { getExportUrl } from "../../api/client.ts";
import type { StemInfo } from "../../api/types.ts";

interface Props {
  stem: StemInfo;
}

export const StemTrack: React.FC<Props> = ({ stem }) => {
  const jobId = useAppStore((s) => s.jobId);
  const exportFormat = useAppStore((s) => s.exportFormat);
  const stemState = useAppStore((s) => s.stemStates[stem.name]);
  const toggleMute = useAppStore((s) => s.toggleMute);
  const toggleSolo = useAppStore((s) => s.toggleSolo);
  const setVolume = useAppStore((s) => s.setVolume);

  if (!stemState) return null;

  const downloadUrl = jobId
    ? getExportUrl(jobId, exportFormat, stem.name)
    : "#";

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-surface/50 hover:bg-bg-surface transition-colors">
      <div
        className="w-2 h-8 rounded-full shrink-0"
        style={{ backgroundColor: stem.color }}
      />
      <span className="text-xs font-medium w-16 truncate text-text-primary">
        {stem.displayName}
      </span>

      <button
        onClick={() => toggleMute(stem.name)}
        className={`px-2 py-0.5 text-xs rounded font-bold transition-colors cursor-pointer
          ${stemState.muted ? "bg-danger text-white" : "bg-bg-hover text-text-secondary hover:text-text-primary"}`}
      >
        M
      </button>
      <button
        onClick={() => toggleSolo(stem.name)}
        className={`px-2 py-0.5 text-xs rounded font-bold transition-colors cursor-pointer
          ${stemState.soloed ? "bg-accent text-bg-primary" : "bg-bg-hover text-text-secondary hover:text-text-primary"}`}
      >
        S
      </button>

      <div className="flex items-center gap-2 flex-1">
        {stemState.muted ? (
          <VolumeX className="w-3.5 h-3.5 text-text-muted shrink-0" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-text-secondary shrink-0" />
        )}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={stemState.volume}
          onChange={(e) => setVolume(stem.name, parseFloat(e.target.value))}
          className="flex-1"
        />
      </div>

      <a
        href={downloadUrl}
        download
        className="p-1.5 text-text-muted hover:text-accent transition-colors"
        title={`Download ${stem.displayName}`}
      >
        <Download className="w-3.5 h-3.5" />
      </a>
    </div>
  );
};
