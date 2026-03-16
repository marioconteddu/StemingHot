import React from "react";
import { StemMixer } from "../mixer/StemMixer.tsx";
import { ExportPanel } from "../export/ExportPanel.tsx";
import { Sliders } from "lucide-react";
import { selectHasReviewResults, useAppStore } from "../../store/appStore.ts";

export const RightPanel: React.FC = () => {
  const showReviewPanel = useAppStore(selectHasReviewResults);

  if (!showReviewPanel) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <Sliders className="w-4 h-4 text-accent" />
        <div>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Refine & Export
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Mix stems and download the result set once separation is complete.
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <StemMixer />
        <ExportPanel />
      </div>
    </div>
  );
};
