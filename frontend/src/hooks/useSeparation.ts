import { useCallback } from "react";
import { useAppStore } from "../store/appStore.ts";
import {
  formatApiError,
  uploadFile,
  startSeparation,
  getJobStatus,
  getStemUrl,
  downloadUrl,
} from "../api/client.ts";
import { resolveQualitySettings, STEM_COLORS } from "../api/types.ts";
import type { StemInfo } from "../api/types.ts";

export function useSeparation() {
  const store = useAppStore();

  const handleUpload = useCallback(
    async (file: File) => {
      store.reset();
      store.setFile(file);
      store.setTransportError(null);
      store.setBackendDetail(null);
      store.setJobStatus("uploaded");
      store.setProgress(0, "Uploading file...");
      try {
        const job = await uploadFile(file);
        store.syncJobInfo(job);
        store.setMetadata(job.metadata);
        store.setJobStatus("uploaded");
        store.setProgress(0, "Ready to separate");
      } catch (err: unknown) {
        store.setTransportError(formatApiError(err, "Upload failed"));
        store.setJobStatus("failed");
      }
    },
    [store],
  );

  const handleUrlDownload = useCallback(
    async (url: string) => {
      store.reset();
      store.setTransportError(null);
      store.setBackendDetail(null);
      store.setJobStatus("uploaded");
      store.setProgress(0, "Downloading source...");
      try {
        const job = await downloadUrl({ url });
        store.syncJobInfo(job);
        store.setMetadata(job.metadata);
        store.setJobStatus("uploaded");
        store.setProgress(0, "Ready to separate");
      } catch (err: unknown) {
        store.setTransportError(formatApiError(err, "Download failed"));
        store.setJobStatus("failed");
      }
    },
    [store],
  );

  const handleSeparate = useCallback(async () => {
    const { jobId, stemConfig, qualityMode, advancedSettings } =
      useAppStore.getState();
    if (!jobId) return;

    store.setTransportError(null);
    store.setBackendDetail(null);
    store.setJobStatus("separating");
    store.setProgress(0, "Starting separation...");

    try {
      const started = await startSeparation({
        jobId,
        stemConfig,
        qualityMode,
        settings: resolveQualitySettings(qualityMode, advancedSettings),
      });
      store.syncJobInfo(started);

      const poll = async () => {
        try {
          const status = await getJobStatus(jobId);
          store.syncJobInfo(status);

          if (status.status === "completed" && status.stems) {
            const stems: StemInfo[] = status.stems.map((s) => ({
              ...s,
              color: STEM_COLORS[s.name] ?? "#6b7280",
              url: getStemUrl(jobId, s.name),
            }));
            store.setStems(stems);
            store.initStemStates(stems.map((s) => s.name));
            store.setJobStatus("completed");
            store.setProgress(100, status.stage ?? "Complete");
          } else if (status.status === "failed") {
            store.setBackendDetail(status.error ?? "Separation failed");
            store.setJobStatus("failed");
          } else {
            store.setProgress(status.progress, status.stage ?? "Separating...");
            setTimeout(poll, 1000);
          }
        } catch (err: unknown) {
          store.setTransportError(
            formatApiError(err, "Polling job status failed"),
          );
          store.setJobStatus("failed");
        }
      };
      setTimeout(poll, 2000);
    } catch (err: unknown) {
      store.setTransportError(formatApiError(err, "Separation request failed"));
      store.setJobStatus("failed");
    }
  }, [store]);

  return { handleUpload, handleUrlDownload, handleSeparate };
}
