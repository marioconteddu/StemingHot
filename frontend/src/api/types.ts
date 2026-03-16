export type StemConfig = "2stems" | "4stems" | "5stems";
export type QualityMode = "stable-local" | "max-quality" | "custom";

export type JobStatus = "uploaded" | "separating" | "completed" | "failed";

export interface AudioMetadata {
  filename: string;
  title: string;
  duration: number;
  sampleRate: number;
  channels: number;
  format: string;
  bpm?: number;
  musicalKey?: string;
  thumbnail?: string;
}

export interface JobEvent {
  timestamp: number;
  level: string;
  stage: string;
  message: string;
  detail?: string;
  data: Record<string, unknown>;
}

export interface JobDiagnostics {
  requestId: string;
  device?: string;
  modelName?: string;
  stemConfig?: StemConfig;
  qualityMode?: QualityMode;
  settings?: Record<string, unknown>;
  inputPath?: string;
  outputPaths: Record<string, string>;
  events: JobEvent[];
}

export interface JobInfo {
  jobId: string;
  status: JobStatus;
  progress: number;
  metadata: AudioMetadata;
  stems?: StemInfo[];
  error?: string;
  stage?: string;
  diagnostics?: JobDiagnostics;
}

export interface StemInfo {
  name: string;
  displayName: string;
  color: string;
  url: string;
}

export interface SeparateRequest {
  jobId: string;
  stemConfig: StemConfig;
  qualityMode: QualityMode;
  settings?: AdvancedSettings;
}

export interface AdvancedSettings {
  segment: number;
  overlap: number;
  shifts: number;
  precision: "float32" | "float16";
}

export const QUALITY_MODE_PRESETS: Record<
  Exclude<QualityMode, "custom">,
  AdvancedSettings
> = {
  "stable-local": {
    segment: 7.8,
    overlap: 0.25,
    shifts: 0,
    precision: "float32",
  },
  "max-quality": {
    segment: 7.8,
    overlap: 0.5,
    shifts: 2,
    precision: "float32",
  },
};

export function resolveQualitySettings(
  qualityMode: QualityMode,
  customSettings: AdvancedSettings,
): AdvancedSettings {
  if (qualityMode === "custom") {
    return customSettings;
  }

  return { ...QUALITY_MODE_PRESETS[qualityMode] };
}

export interface ExportRequest {
  jobId: string;
  format: "wav" | "flac" | "mp3";
  stems?: string[];
  nameTemplate?: string;
}

export interface UrlDownloadRequest {
  url: string;
}

export interface UrlMetadata {
  title: string;
  duration: number;
  thumbnail?: string;
  url: string;
}

export interface ProgressMessage {
  jobId: string;
  status: JobStatus;
  progress: number;
  stage: string;
  detail?: string;
  event?: JobEvent;
}

export const STEM_COLORS: Record<string, string> = {
  vocals: "#06b6d4",
  drums: "#f97316",
  bass: "#a855f7",
  piano: "#22c55e",
  guitar: "#ec4899",
  other: "#6b7280",
  instrumental: "#6b7280",
};

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  ...QUALITY_MODE_PRESETS["max-quality"],
};
