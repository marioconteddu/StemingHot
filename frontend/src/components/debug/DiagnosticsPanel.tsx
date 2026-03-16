import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Bug, Wifi } from "lucide-react";
import { useAppStore } from "../../store/appStore.ts";

export const DiagnosticsPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const jobId = useAppStore((s) => s.jobId);
  const jobStatus = useAppStore((s) => s.jobStatus);
  const progressStage = useAppStore((s) => s.progressStage);
  const backendDetail = useAppStore((s) => s.backendDetail);
  const transportError = useAppStore((s) => s.transportError);
  const websocketState = useAppStore((s) => s.websocketState);
  const diagnostics = useAppStore((s) => s.diagnostics);
  const eventTimeline = useAppStore((s) => s.eventTimeline);

  const visibleEvents = useMemo(
    () => eventTimeline.slice(-8).reverse(),
    [eventTimeline],
  );

  if (!jobId && !backendDetail && !transportError) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-bg-surface/50">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-accent" />
          <div>
            <p className="text-xs font-semibold text-text-primary">
              Diagnostics
            </p>
            <p className="text-[10px] text-text-muted">
              Job {jobId ?? "n/a"} · {jobStatus ?? "idle"}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 text-[11px]">
          <div className="grid grid-cols-2 gap-2 text-text-secondary">
            <div>
              <span className="text-text-muted">Request</span>
              <p className="font-mono break-all">{diagnostics?.requestId ?? "n/a"}</p>
            </div>
            <div>
              <span className="text-text-muted">WebSocket</span>
              <p className="flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                {websocketState}
              </p>
            </div>
            <div>
              <span className="text-text-muted">Model</span>
              <p>{diagnostics?.modelName ?? "n/a"}</p>
            </div>
            <div>
              <span className="text-text-muted">Quality Mode</span>
              <p>{diagnostics?.qualityMode ?? "n/a"}</p>
            </div>
            <div>
              <span className="text-text-muted">Device</span>
              <p>{diagnostics?.device ?? "n/a"}</p>
            </div>
            <div className="col-span-2">
              <span className="text-text-muted">Stage</span>
              <p>{progressStage || "n/a"}</p>
            </div>
          </div>

          {backendDetail && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-2">
              <p className="text-[10px] uppercase tracking-wider text-danger mb-1">
                Backend Detail
              </p>
              <p className="text-danger break-words">{backendDetail}</p>
            </div>
          )}

          {transportError && (
            <div className="rounded-md border border-accent/30 bg-accent/10 p-2">
              <p className="text-[10px] uppercase tracking-wider text-accent mb-1">
                Transport Detail
              </p>
              <p className="text-accent break-words">{transportError}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
              Recent Events
            </p>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {visibleEvents.length === 0 ? (
                <p className="text-text-muted">No events yet</p>
              ) : (
                visibleEvents.map((event, index) => (
                  <div
                    key={`${event.timestamp}-${event.stage}-${index}`}
                    className="rounded-md border border-border px-2 py-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-text-primary">{event.stage}</span>
                      <span className="text-text-muted">
                        {new Date(event.timestamp * 1000).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-text-secondary">{event.message}</p>
                    {event.detail && (
                      <p className="text-danger break-words">{event.detail}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
