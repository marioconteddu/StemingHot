import React, { useState } from "react";
import { ChevronDown, ChevronRight, Settings } from "lucide-react";
import { useAppStore } from "../../store/appStore.ts";
import { DiagnosticsPanel } from "../debug/DiagnosticsPanel.tsx";
import type { QualityMode, StemConfig } from "../../api/types.ts";

const STEM_OPTIONS: { value: StemConfig; label: string; detail: string }[] = [
  { value: "2stems", label: "2 Stems", detail: "Vocals / Instrumental" },
  { value: "4stems", label: "4 Stems", detail: "Vocals / Drums / Bass / Other" },
];

const QUALITY_MODE_OPTIONS: {
  value: QualityMode;
  label: string;
  detail: string;
}[] = [
  {
    value: "stable-local",
    label: "Stable Local",
    detail: "Safe defaults for long tracks and predictable local runs.",
  },
  {
    value: "max-quality",
    label: "Max Quality",
    detail: "Higher overlap and heavier inference requests for best separation.",
  },
  {
    value: "custom",
    label: "Custom",
    detail: "Use the tuning controls below to override the preset.",
  },
];

export const AdvancedSettings: React.FC = () => {
  const [open, setOpen] = useState(false);
  const stemConfig = useAppStore((s) => s.stemConfig);
  const qualityMode = useAppStore((s) => s.qualityMode);
  const setStemConfig = useAppStore((s) => s.setStemConfig);
  const setQualityMode = useAppStore((s) => s.setQualityMode);
  const settings = useAppStore((s) => s.advancedSettings);
  const setAdvancedSettings = useAppStore((s) => s.setAdvancedSettings);
  const jobStatus = useAppStore((s) => s.jobStatus);
  const isCustomMode = qualityMode === "custom";
  const isBusy = jobStatus === "separating";

  return (
    <div className="rounded-lg border border-border bg-bg-surface/30">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs
          text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
      >
        <Settings className="w-3.5 h-3.5" />
        <div className="text-left">
          <span className="block">Advanced Settings</span>
          <span className="block text-[10px] text-text-muted">
            Quality, stem config, diagnostics, and expert tuning.
          </span>
        </div>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 ml-auto" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          <div>
            <label className="text-xs text-text-secondary block mb-2">
              Quality Mode
            </label>
            <div className="space-y-1.5">
              {QUALITY_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setQualityMode(opt.value)}
                  disabled={isBusy}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer
                    ${
                      qualityMode === opt.value
                        ? "bg-accent/15 border border-accent/40 text-accent"
                        : "bg-bg-surface border border-border text-text-secondary hover:border-border-light"
                    }
                    ${isBusy ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="block text-[10px] opacity-75 mt-0.5">
                    {opt.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-text-secondary block mb-2">
              Stem Configuration
            </label>
            <div className="space-y-1.5">
              {STEM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStemConfig(opt.value)}
                  disabled={isBusy}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer
                    ${
                      stemConfig === opt.value
                        ? "bg-accent/15 border border-accent/40 text-accent"
                        : "bg-bg-surface border border-border text-text-secondary hover:border-border-light"
                    }
                    ${isBusy ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="block text-[10px] opacity-75 mt-0.5">
                    {opt.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {!isCustomMode && (
            <div className="rounded-md border border-border bg-bg-surface px-2 py-2 text-[10px] text-text-muted">
              This preset controls the values below. Switch Quality Mode to
              {" "}Custom to edit them directly.
            </div>
          )}
          <div>
            <label className="text-xs text-text-secondary block mb-1">
              Segment Length (seconds)
            </label>
            <input
              type="number"
              disabled={!isCustomMode}
              min={2}
              max={7.8}
              step={0.1}
              value={settings.segment}
              onChange={(e) =>
                setAdvancedSettings({ segment: Number(e.target.value) })
              }
              className="w-full bg-bg-surface text-xs text-text-primary rounded px-2 py-1.5
                border border-border outline-none focus:border-accent disabled:opacity-60"
            />
            <p className="mt-1 text-[10px] text-text-muted">
              HTDemucs is stable at about <span className="text-text-secondary font-medium">7.8s max</span>.
            </p>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">
              Overlap (0.0 - 0.5)
            </label>
            <input
              type="number"
              disabled={!isCustomMode}
              min={0}
              max={0.5}
              step={0.05}
              value={settings.overlap}
              onChange={(e) =>
                setAdvancedSettings({ overlap: Number(e.target.value) })
              }
              className="w-full bg-bg-surface text-xs text-text-primary rounded px-2 py-1.5
                border border-border outline-none focus:border-accent disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">
              Random Shifts
            </label>
            <input
              type="number"
              disabled={!isCustomMode}
              min={0}
              max={5}
              value={settings.shifts}
              onChange={(e) =>
                setAdvancedSettings({ shifts: Number(e.target.value) })
              }
              className="w-full bg-bg-surface text-xs text-text-primary rounded px-2 py-1.5
                border border-border outline-none focus:border-accent disabled:opacity-60"
            />
            <p className="mt-1 text-[10px] text-text-muted">
              Stable Local keeps this at{" "}
              <span className="text-text-secondary font-medium">0</span>; Max
              Quality requests extra shifts, though the current backend may
              still clamp them at runtime.
            </p>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">
              Precision
            </label>
            <select
              disabled={!isCustomMode}
              value={settings.precision}
              onChange={(e) =>
                setAdvancedSettings({
                  precision: e.target.value as "float32" | "float16",
                })
              }
              className="w-full bg-bg-surface text-xs text-text-primary rounded px-2 py-1.5
                border border-border outline-none focus:border-accent disabled:opacity-60"
            >
              <option value="float32">Float32 (Higher Quality)</option>
              <option value="float16">Float16 (Faster)</option>
            </select>
          </div>

          <DiagnosticsPanel />
        </div>
      )}
    </div>
  );
};
