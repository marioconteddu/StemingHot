import React, { useEffect, useRef, useState } from "react";
import { LeftPanel } from "./LeftPanel.tsx";
import { CenterPanel } from "./CenterPanel.tsx";
import { selectHasReviewResults, useAppStore } from "../../store/appStore.ts";
import { Button } from "../common/Button.tsx";
import { ChevronRight, RotateCcw } from "lucide-react";

function formatCollapsedBpm(bpm?: number): string {
  if (typeof bpm !== "number" || Number.isNaN(bpm) || bpm <= 0) {
    return "--";
  }
  return `${Math.round(bpm)}`;
}

export const AppLayout: React.FC = () => {
  const showReviewPanel = useAppStore(selectHasReviewResults);
  const metadata = useAppStore((s) => s.metadata);
  const reset = useAppStore((s) => s.reset);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const hasAutoCollapsedRef = useRef(false);

  useEffect(() => {
    if (showReviewPanel && !hasAutoCollapsedRef.current) {
      setIsLeftCollapsed(true);
      hasAutoCollapsedRef.current = true;
      return;
    }

    if (!showReviewPanel) {
      setIsLeftCollapsed(false);
      hasAutoCollapsedRef.current = false;
    }
  }, [showReviewPanel]);

  return (
    <div className="flex h-screen bg-bg-primary">
      <aside
        className={`${isLeftCollapsed ? "w-24" : "w-72"} border-r border-border bg-bg-secondary shrink-0 overflow-hidden transition-[width] duration-300`}
      >
        {isLeftCollapsed ? (
          <div className="flex h-full flex-col items-stretch gap-3 p-3">
            <button
              type="button"
              onClick={() => setIsLeftCollapsed(false)}
              className="flex items-center justify-center rounded-lg border border-border bg-bg-surface/50 px-2 py-2 text-text-secondary transition-colors hover:text-text-primary"
              aria-label="Expand setup panel"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="rounded-lg border border-border bg-bg-surface/40 px-2 py-3 text-center">
              <img
                src="/logo.png"
                alt=""
                className="mx-auto h-8 w-auto object-contain"
                aria-hidden
              />
              <p className="mt-2 text-[10px] uppercase tracking-wider text-text-muted">
                Track
              </p>
              <p className="mt-1 break-words text-[11px] font-medium text-text-primary">
                {metadata?.title || "Ready"}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-bg-surface/40 px-2 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                BPM
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {formatCollapsedBpm(metadata?.bpm)}
              </p>
              <p className="mt-3 text-[10px] uppercase tracking-wider text-text-muted">
                Key
              </p>
              <p className="mt-1 break-words text-[11px] font-medium text-text-primary">
                {metadata?.musicalKey ?? "--"}
              </p>
            </div>

            <Button
              onClick={reset}
              variant="secondary"
              size="sm"
              className="mt-auto px-2"
              title="Start a new track"
            >
              <RotateCcw className="mx-auto h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <LeftPanel
            canCollapse={showReviewPanel}
            onCollapse={() => setIsLeftCollapsed(true)}
          />
        )}
      </aside>
      <main className="flex-1 min-w-0">
        <CenterPanel />
      </main>
    </div>
  );
};
