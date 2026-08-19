import type { ApiErrorBody } from "@/lib/api-types";
import { notifyResponsibilityTermRequired } from "@/lib/responsibility-term-events";

/**
 * Cliente HTTP fino. Sessão é por cookie httpOnly (`credentials: "include"`),
 * nunca bearer token — ver `access_cookie_name`/`refresh_cookie_name` no
 * backend. Nenhuma lógica de autorização aqui: só serializa/desserializa e
 * propaga o erro para quem chamou decidir o que mostrar.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : undefined;

  if (!response.ok) {
    const detail =
      (data as ApiErrorBody | undefined)?.detail ?? `Erro inesperado (HTTP ${response.status}).`;
    if (response.status === 428) notifyResponsibilityTermRequired();
    throw new ApiError(response.status, detail);
  }

  return data as T;
}

interface DownloadResult {
  blob: Blob;
  filename: string;
}

const CONTENT_DISPOSITION_FILENAME = /filename="?([^"]+)"?/;

/** Download binário (ex.: exportação em planilha) — não passa pelo parser JSON de `request`. */
async function getBlob(path: string, signal?: AbortSignal): Promise<DownloadResult> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? ((await response.json()) as ApiErrorBody) : undefined;
    if (response.status === 428) notifyResponsibilityTermRequired();
    throw new ApiError(response.status, data?.detail ?? `Erro inesperado (HTTP ${response.status}).`);
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = CONTENT_DISPOSITION_FILENAME.exec(disposition)?.[1] ?? "download";
  const blob = await response.blob();
  return { blob, filename };
}

export const http = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: "GET", signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: "POST", body, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: "PUT", body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: "PATCH", body, signal }),
  delete: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: "DELETE", signal }),
  getBlob,
};
