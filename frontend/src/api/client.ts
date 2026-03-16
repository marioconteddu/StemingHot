import axios from "axios";
import type {
  JobInfo,
  SeparateRequest,
  UrlDownloadRequest,
  UrlMetadata,
} from "./types.ts";
import { getToken, clearToken } from "../store/authStore.ts";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export function formatApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail =
      typeof error.response?.data?.detail === "string"
        ? error.response.data.detail
        : undefined;
    if (status && detail) {
      return `${fallback} (${status}): ${detail}`;
    }
    if (status) {
      return `${fallback} (${status})`;
    }
    if (error.message) {
      return `${fallback}: ${error.message}`;
    }
  }
  if (error instanceof Error && error.message) {
    return `${fallback}: ${error.message}`;
  }
  return fallback;
}

export async function uploadFile(file: File): Promise<JobInfo> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<JobInfo>("/upload", form);
  return data;
}

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const { data } = await api.post<UrlMetadata>("/url/metadata", { url });
  return data;
}

export async function downloadUrl(req: UrlDownloadRequest): Promise<JobInfo> {
  const { data } = await api.post<JobInfo>("/url/download", req);
  return data;
}

export async function startSeparation(req: SeparateRequest): Promise<JobInfo> {
  const { data } = await api.post<JobInfo>("/separate", req);
  return data;
}

export async function getJobStatus(jobId: string): Promise<JobInfo> {
  const { data } = await api.get<JobInfo>(`/job/${jobId}/status`);
  return data;
}

function appendAuthParam(url: string): string {
  const token = getToken();
  if (!token || token === "no-auth") return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

export function getStemUrl(jobId: string, stemName: string): string {
  return appendAuthParam(`/api/stems/${jobId}/${stemName}`);
}

export function getExportUrl(
  jobId: string,
  format: string,
  stemName?: string,
): string {
  const params = new URLSearchParams({ format });
  if (stemName) params.set("stem", stemName);
  return appendAuthParam(`/api/export/${jobId}?${params}`);
}

export function getExportAllUrl(jobId: string, format: string): string {
  return appendAuthParam(`/api/export/${jobId}/all?format=${format}`);
}

export function createProgressSocket(jobId: string): WebSocket {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const token = getToken();
  const url =
    token && token !== "no-auth"
      ? `${proto}//${window.location.host}/ws/progress/${jobId}?token=${encodeURIComponent(token)}`
      : `${proto}//${window.location.host}/ws/progress/${jobId}`;
  return new WebSocket(url);
}
