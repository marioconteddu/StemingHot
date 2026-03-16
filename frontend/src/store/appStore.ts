import { create } from "zustand";
import type {
  AudioMetadata,
  JobDiagnostics,
  JobEvent,
  JobInfo,
  JobStatus,
  StemConfig,
  StemInfo,
  AdvancedSettings,
  QualityMode,
} from "../api/types.ts";
import {
  DEFAULT_ADVANCED_SETTINGS,
  QUALITY_MODE_PRESETS,
} from "../api/types.ts";

interface StemPlayerState {
  volume: number;
  muted: boolean;
  soloed: boolean;
}

type WebSocketState = "idle" | "connecting" | "open" | "closed" | "error";

export interface AppState {
  // Upload
  file: File | null;
  metadata: AudioMetadata | null;
  setFile: (file: File | null) => void;
  setMetadata: (metadata: AudioMetadata | null) => void;

  // Job
  jobId: string | null;
  jobStatus: JobStatus | null;
  progress: number;
  progressStage: string;
  error: string | null;
  backendDetail: string | null;
  transportError: string | null;
  websocketState: WebSocketState;
  diagnostics: JobDiagnostics | null;
  eventTimeline: JobEvent[];
  setJobId: (id: string | null) => void;
  setJobStatus: (status: JobStatus | null) => void;
  setProgress: (progress: number, stage?: string) => void;
  setError: (error: string | null) => void;
  setBackendDetail: (detail: string | null) => void;
  setTransportError: (error: string | null) => void;
  setWebSocketState: (state: WebSocketState) => void;
  setDiagnostics: (diagnostics: JobDiagnostics | null) => void;
  appendEvent: (event: JobEvent) => void;
  syncJobInfo: (job: JobInfo) => void;

  // Stems
  stemConfig: StemConfig;
  qualityMode: QualityMode;
  stems: StemInfo[];
  setStemConfig: (config: StemConfig) => void;
  setQualityMode: (mode: QualityMode) => void;
  setStems: (stems: StemInfo[]) => void;

  // Player
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  stemStates: Record<string, StemPlayerState>;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  toggleMute: (stemName: string) => void;
  toggleSolo: (stemName: string) => void;
  setVolume: (stemName: string, volume: number) => void;
  initStemStates: (stemNames: string[]) => void;

  // Export
  exportFormat: "wav" | "flac" | "mp3";
  stemNames: Record<string, string>;
  setExportFormat: (format: "wav" | "flac" | "mp3") => void;
  setStemName: (stemKey: string, name: string) => void;

  // Advanced settings
  advancedSettings: AdvancedSettings;
  setAdvancedSettings: (settings: Partial<AdvancedSettings>) => void;

  // Reset
  reset: () => void;
}

const initialStemState: StemPlayerState = {
  volume: 1,
  muted: false,
  soloed: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  file: null,
  metadata: null,
  setFile: (file) => set({ file }),
  setMetadata: (metadata) => set({ metadata }),

  jobId: null,
  jobStatus: null,
  progress: 0,
  progressStage: "",
  error: null,
  backendDetail: null,
  transportError: null,
  websocketState: "idle",
  diagnostics: null,
  eventTimeline: [],
  setJobId: (jobId) => set({ jobId }),
  setJobStatus: (jobStatus) => set({ jobStatus }),
  setProgress: (progress, stage) =>
    set({ progress, ...(stage ? { progressStage: stage } : {}) }),
  setError: (error) => set({ error }),
  setBackendDetail: (backendDetail) =>
    set((state) => ({
      backendDetail,
      error: backendDetail ?? state.transportError ?? null,
    })),
  setTransportError: (transportError) =>
    set((state) => ({
      transportError,
      error: state.backendDetail ?? transportError ?? null,
    })),
  setWebSocketState: (websocketState) => set({ websocketState }),
  setDiagnostics: (diagnostics) =>
    set({
      diagnostics,
      eventTimeline: diagnostics?.events ?? [],
    }),
  appendEvent: (event) =>
    set((state) => ({
      eventTimeline: [...state.eventTimeline, event].slice(-100),
    })),
  syncJobInfo: (job) =>
    set((state) => ({
      jobId: job.jobId,
      jobStatus: job.status,
      progress: job.progress,
      progressStage: job.stage ?? state.progressStage,
      metadata: job.metadata ?? state.metadata,
      diagnostics: job.diagnostics ?? state.diagnostics,
      eventTimeline: job.diagnostics?.events ?? state.eventTimeline,
      backendDetail: job.error ?? state.backendDetail,
      error: job.error ?? state.transportError ?? null,
    })),

  stemConfig: "4stems",
  qualityMode: "max-quality",
  stems: [],
  setStemConfig: (stemConfig) => set({ stemConfig }),
  setQualityMode: (qualityMode) =>
    set((state) => ({
      qualityMode,
      advancedSettings:
        qualityMode === "custom"
          ? state.advancedSettings
          : { ...QUALITY_MODE_PRESETS[qualityMode] },
    })),
  setStems: (stems) => set({ stems }),

  isPlaying: false,
  currentTime: 0,
  duration: 0,
  stemStates: {},
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  toggleMute: (stemName) =>
    set((state) => {
      const current = state.stemStates[stemName] ?? { ...initialStemState };
      return {
        stemStates: {
          ...state.stemStates,
          [stemName]: { ...current, muted: !current.muted },
        },
      };
    }),
  toggleSolo: (stemName) =>
    set((state) => {
      const current = state.stemStates[stemName] ?? { ...initialStemState };
      const wasSoloed = current.soloed;
      const newStates: Record<string, StemPlayerState> = {};
      for (const [key, val] of Object.entries(state.stemStates)) {
        newStates[key] =
          key === stemName
            ? { ...val, soloed: !wasSoloed }
            : { ...val, soloed: false };
      }
      return { stemStates: newStates };
    }),
  setVolume: (stemName, volume) =>
    set((state) => {
      const current = state.stemStates[stemName] ?? { ...initialStemState };
      return {
        stemStates: {
          ...state.stemStates,
          [stemName]: { ...current, volume },
        },
      };
    }),
  initStemStates: (stemNames) =>
    set({
      stemStates: Object.fromEntries(
        stemNames.map((n) => [n, { ...initialStemState }]),
      ),
    }),

  exportFormat: "wav",
  stemNames: {},
  setExportFormat: (exportFormat) => set({ exportFormat }),
  setStemName: (stemKey, name) =>
    set((state) => ({
      stemNames: { ...state.stemNames, [stemKey]: name },
    })),

  advancedSettings: { ...DEFAULT_ADVANCED_SETTINGS },
  setAdvancedSettings: (settings) =>
    set((state) => ({
      qualityMode: "custom",
      advancedSettings: { ...state.advancedSettings, ...settings },
    })),

  reset: () =>
    set({
      file: null,
      metadata: null,
      jobId: null,
      jobStatus: null,
      progress: 0,
      progressStage: "",
      error: null,
      backendDetail: null,
      transportError: null,
      websocketState: "idle",
      diagnostics: null,
      eventTimeline: [],
      stemConfig: "4stems",
      qualityMode: "max-quality",
      advancedSettings: { ...DEFAULT_ADVANCED_SETTINGS },
      stems: [],
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      stemStates: {},
      stemNames: {},
    }),
}));

export const selectHasReviewResults = (state: AppState) =>
  state.jobStatus === "completed" && state.stems.length > 0;
