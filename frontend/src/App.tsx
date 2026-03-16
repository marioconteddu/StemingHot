import React from "react";
import { AppLayout } from "./components/layout/AppLayout.tsx";
import { useAppStore } from "./store/appStore.ts";
import { useProgressSocket } from "./hooks/useWebSocket.ts";

export const App: React.FC = () => {
  const jobId = useAppStore((s) => s.jobId);
  useProgressSocket(jobId);

  return <AppLayout />;
};
