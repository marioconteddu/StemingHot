import { describe, expect, it, beforeEach } from "vitest";
import { useAppStore } from "./appStore.ts";

describe("appStore diagnostics", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it("syncs backend diagnostics and preserves backend detail over transport errors", () => {
    const store = useAppStore.getState();

    store.syncJobInfo({
      jobId: "job-123",
      status: "failed",
      progress: 41,
      metadata: {
        filename: "smoke_test.wav",
        title: "smoke_test",
        duration: 2,
        sampleRate: 44100,
        channels: 2,
        format: "wav",
      },
      error: "Detailed backend failure",
      stage: "Separating stems...",
      diagnostics: {
        requestId: "req-1",
        device: "cuda",
        modelName: "htdemucs_ft",
        outputPaths: {},
        events: [
          {
            timestamp: Date.now() / 1000,
            level: "error",
            stage: "Separating stems...",
            message: "Separating stems...",
            detail: "Detailed backend failure",
            data: {},
          },
        ],
      },
    });

    store.setTransportError("WebSocket closed unexpectedly");

    const state = useAppStore.getState();
    expect(state.backendDetail).toBe("Detailed backend failure");
    expect(state.transportError).toBe("WebSocket closed unexpectedly");
    expect(state.error).toBe("Detailed backend failure");
    expect(state.eventTimeline).toHaveLength(1);
    expect(state.diagnostics?.requestId).toBe("req-1");
  });
});
