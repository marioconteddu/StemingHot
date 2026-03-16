import React from "react";
import { Download, Package } from "lucide-react";
import { useAppStore } from "../../store/appStore.ts";
import { getExportAllUrl, getExportUrl } from "../../api/client.ts";
import { Button } from "../common/Button.tsx";

export const ExportPanel: React.FC = () => {
  const jobId = useAppStore((s) => s.jobId);
  const stems = useAppStore((s) => s.stems);
  const exportFormat = useAppStore((s) => s.exportFormat);
  const setExportFormat = useAppStore((s) => s.setExportFormat);
  const stemNames = useAppStore((s) => s.stemNames);
  const setStemName = useAppStore((s) => s.setStemName);

  if (!jobId || stems.length === 0) return null;

  const formats = ["wav", "flac", "mp3"] as const;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-bg-primary/40 p-3">
      <div>
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Export
        </h3>
        <p className="mt-1 text-xs text-text-muted">
          Pick a format, adjust per-stem labels, and download stems individually or together.
        </p>
      </div>

      <div className="flex gap-1">
        {formats.map((fmt) => (
          <button
            key={fmt}
            onClick={() => setExportFormat(fmt)}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer
              ${exportFormat === fmt
                ? "bg-accent text-bg-primary"
                : "bg-bg-surface text-text-secondary hover:text-text-primary"
              }`}
          >
            {fmt.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {stems.map((stem) => (
          <div key={stem.name} className="flex items-center gap-2">
            <input
              type="text"
              value={stemNames[stem.name] ?? stem.displayName}
              onChange={(e) => setStemName(stem.name, e.target.value)}
              className="flex-1 bg-bg-surface text-xs text-text-primary rounded px-2 py-1.5
                border border-border outline-none focus:border-accent"
            />
            <a
              href={getExportUrl(jobId, exportFormat, stem.name)}
              download
              className="p-1.5 text-text-muted hover:text-accent transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>

      <a href={getExportAllUrl(jobId, exportFormat)} download>
        <Button variant="secondary" size="sm" className="w-full">
          <Package className="w-3.5 h-3.5 mr-1.5 inline" />
          Download All Stems
        </Button>
      </a>
    </section>
  );
};
