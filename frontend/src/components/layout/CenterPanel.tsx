import React from "react";
import { WaveformTimeline } from "../waveform/WaveformTimeline.tsx";
import { ProgressBar } from "../common/ProgressBar.tsx";
import { useAppStore } from "../../store/appStore.ts";
import { Loader2, Waves } from "lucide-react";

export const CenterPanel: React.FC = () => {
  const jobStatus = useAppStore((s) => s.jobStatus);
  const progress = useAppStore((s) => s.progress);
  const progressStage = useAppStore((s) => s.progressStage);
  const metadata = useAppStore((s) => s.metadata);

  const progressSummary =
    progress < 15
      ? "Preparing the job and loading the source."
      : progress < 90
        ? "Inference progress is estimated from track length and current runtime."
        : progress < 100
          ? "Finalizing stems and writing audio files to disk."
          : "Separation complete.";

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <Waves className="w-4 h-4 text-accent" />
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Waveform Timeline
        </h3>
      </div>
      <div className="flex-1 min-h-0">
        {jobStatus === "completed" ? (
          <WaveformTimeline />
        ) : jobStatus === "separating" ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="w-full max-w-md space-y-4">
              <ProgressBar progress={progress} label={progressStage} />
              <div className="rounded-xl border border-border bg-bg-surface/30 p-4 text-center space-y-2">
                <p className="text-3xl font-semibold text-text-primary">
                  {Math.round(progress)}%
                </p>
                {metadata?.title && (
                  <p className="text-sm text-text-secondary">{metadata.title}</p>
                )}
                <p className="text-xs text-text-muted">{progressSummary}</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing audio...
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            Upload a track to begin
          </div>
        )}
      </div>
    </div>
  );
};
