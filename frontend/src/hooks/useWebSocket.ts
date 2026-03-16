import { useEffect, useRef, useCallback } from "react";
import type { ProgressMessage } from "../api/types.ts";
import { useAppStore } from "../store/appStore.ts";
import { createProgressSocket } from "../api/client.ts";

export function useProgressSocket(jobId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const setProgress = useAppStore((s) => s.setProgress);
  const setJobStatus = useAppStore((s) => s.setJobStatus);
  const setBackendDetail = useAppStore((s) => s.setBackendDetail);
  const setTransportError = useAppStore((s) => s.setTransportError);
  const setWebSocketState = useAppStore((s) => s.setWebSocketState);
  const appendEvent = useAppStore((s) => s.appendEvent);

  const connect = useCallback(() => {
    if (!jobId) return;
    setWebSocketState("connecting");
    const ws = createProgressSocket(jobId);

    ws.onopen = () => {
      setWebSocketState("open");
      setTransportError(null);
    };

    ws.onmessage = (event) => {
      const msg: ProgressMessage = JSON.parse(event.data);
      setProgress(msg.progress, msg.stage);
      setJobStatus(msg.status);
      if (msg.event) {
        appendEvent(msg.event);
      }
      if (msg.status === "failed" && msg.detail) {
        setBackendDetail(msg.detail);
      }
    };

    ws.onerror = () => {
      setWebSocketState("error");
      setTransportError("WebSocket connection error");
    };

    ws.onclose = (event) => {
      setWebSocketState("closed");
      if (!event.wasClean && event.code !== 1000) {
        setTransportError(`WebSocket closed unexpectedly (${event.code})`);
      }
    };

    wsRef.current = ws;
  }, [
    appendEvent,
    jobId,
    setBackendDetail,
    setJobStatus,
    setProgress,
    setTransportError,
    setWebSocketState,
  ]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      setWebSocketState("idle");
    };
  }, [connect, setWebSocketState]);

  return wsRef;
}
