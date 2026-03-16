import React from "react";
import { Link } from "react-router-dom";
import { UploadZone } from "../upload/UploadZone.tsx";
import { UrlInput } from "../upload/UrlInput.tsx";
import { FileInfo } from "../upload/FileInfo.tsx";
import { AdvancedSettings } from "../settings/AdvancedSettings.tsx";
import { ExportPanel } from "../export/ExportPanel.tsx";
import { Button } from "../common/Button.tsx";
import { useAppStore } from "../../store/appStore.ts";
import { useSeparation } from "../../hooks/useSeparation.ts";
import { clearToken } from "../../store/authStore.ts";
import { Loader2, RotateCcw, AlertCircle, ChevronLeft, LogOut } from "lucide-react";

function formatDetectedBpm(bpm?: number): string | null {
  if (typeof bpm !== "number" || Number.isNaN(bpm) || bpm <= 0) {
    return null;
  }
  return `${Math.round(bpm)} BPM`;
}

interface LeftPanelProps {
  canCollapse?: boolean;
  onCollapse?: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  canCollapse = false,
  onCollapse,
}) => {
  const metadata = useAppStore((s) => s.metadata);
  const jobStatus = useAppStore((s) => s.jobStatus);
  const error = useAppStore((s) => s.error);
  const reset = useAppStore((s) => s.reset);

  const { handleUpload, handleUrlDownload, handleSeparate } = useSeparation();

  const isBusy = jobStatus === "separating";
  const canSeparate = jobStatus === "uploaded";
  const detectedBpm = formatDetectedBpm(metadata?.bpm);
  const detectedKey = metadata?.musicalKey;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <img
            src="/logo.png"
            alt=""
            className="h-12 w-auto object-contain object-left mb-2"
            aria-hidden
          />
          <h2 className="text-sm font-bold uppercase tracking-tight mb-1">
            <span className="brand-title-steming">STEMING</span>
            <span className="brand-title-hot">HOT</span>
          </h2>
          <p className="text-xs text-text-muted">Stem Separation Studio</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              clearToken();
              window.location.href = "/login";
            }}
            className="rounded-lg border border-border bg-bg-surface/50 p-2 text-text-secondary transition-colors hover:text-text-primary"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
          {canCollapse && onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="rounded-lg border border-border bg-bg-surface/50 p-2 text-text-secondary transition-colors hover:text-text-primary"
              aria-label="Collapse setup panel"
              title="Collapse setup panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <UploadZone onFileSelected={handleUpload} disabled={isBusy} />

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-muted">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <UrlInput onUrlSubmit={handleUrlDownload} disabled={isBusy} />

        {metadata && <FileInfo metadata={metadata} />}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 min-w-0">
            <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-xs text-danger break-words min-w-0 flex-1" title={error}>
              {error}
            </p>
          </div>
        )}

        {(canSeparate || isBusy) && (
          <>
            <AdvancedSettings />

            {isBusy ? (
              <div className="flex items-center justify-center gap-2 text-xs text-text-muted py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processing...
              </div>
            ) : (
              <Button onClick={handleSeparate} className="w-full" size="lg">
                Separate Stems
              </Button>
            )}
          </>
        )}

        {(jobStatus === "completed" || jobStatus === "failed") && (
          <>
            {jobStatus === "completed" && <ExportPanel />}

            <div className="rounded-lg border border-border bg-bg-surface/50 p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Track Analysis
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-text-muted">Estimated BPM</p>
                  <p className="font-medium text-text-primary">
                    {detectedBpm ?? "Unavailable"}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted">Estimated Key</p>
                  <p className="font-medium text-text-primary">
                    {detectedKey ?? "Unavailable"}
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={reset} variant="secondary" className="w-full">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 inline" />
              {jobStatus === "failed" ? "Reset After Failure" : "New Track"}
            </Button>
          </>
        )}

        <div className="pt-4 mt-auto">
          <Link
            to="/terms"
            className="text-[11px] text-text-muted hover:text-text-secondary"
          >
            Terms and Conditions
          </Link>
        </div>
      </div>
    </div>
  );
};
