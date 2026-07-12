import { runtimeConfig } from "@/config/runtime";

export type ApiErrorDetail = string | Array<{ msg?: string; [key: string]: unknown }> | Record<string, unknown>;

export class ApiError extends Error {
  readonly status: number;
  readonly detail?: ApiErrorDetail;

  constructor(status: number, detail?: ApiErrorDetail) {
    super(formatError(status, detail));
    this.name = "ApiError";
    this.status = status;
    if (detail !== undefined) this.detail = detail;
  }
}

type RequestOptions = Omit<RequestInit, "body" | "signal"> & {
  body?: unknown;
  authRedirect?: boolean;
  signal?: AbortSignal | null | undefined;
};

function formatError(status: number, detail?: ApiErrorDetail): string {
  if (!detail) return `Error ${status}`;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((entry) => entry.msg ?? JSON.stringify(entry)).join("; ");
  const message = detail.message;
  return typeof message === "string" ? message : JSON.stringify(detail);
}

function currentLanguage(): string {
  return document.documentElement.lang || localStorage.getItem("ga-lang") || "es";
}

function loginUrl(): string {
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (location.pathname.startsWith("/login")) return "/login/";
  return `/login/?redirect=${encodeURIComponent(current)}`;
}

async function parseError(response: Response): Promise<ApiError> {
  const payload = (await response.json().catch(() => null)) as { detail?: ApiErrorDetail } | null;
  return new ApiError(response.status, payload?.detail);
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { body: sourceBody, authRedirect = true, signal, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  headers.set("Accept-Language", currentLanguage());

  let body: BodyInit | undefined;
  if (sourceBody instanceof FormData || sourceBody instanceof Blob || typeof sourceBody === "string") {
    body = sourceBody;
  } else if (sourceBody !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(sourceBody);
  }

  const response = await fetch(`${runtimeConfig.API_BASE}${url}`, {
    ...requestOptions,
    ...(body === undefined ? {} : { body }),
    ...(signal ? { signal } : {}),
    headers,
    credentials: "same-origin",
  });

  if (response.status === 401 && authRedirect) {
    window.dispatchEvent(new CustomEvent("gaia:unauthorized"));
    location.replace(loginUrl());
    throw new ApiError(401);
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(url: string, signal?: AbortSignal, authRedirect = true) =>
    request<T>(url, { signal, authRedirect }),
  post: <T, B = unknown>(url: string, body?: B, signal?: AbortSignal) =>
    request<T>(url, { method: "POST", body, signal }),
  put: <T, B = unknown>(url: string, body?: B, signal?: AbortSignal) =>
    request<T>(url, { method: "PUT", body, signal }),
  patch: <T, B = unknown>(url: string, body?: B, signal?: AbortSignal) =>
    request<T>(url, { method: "PATCH", body, signal }),
  delete: <T>(url: string, signal?: AbortSignal) => request<T>(url, { method: "DELETE", signal }),
  upload: <T>(url: string, formData: FormData, signal?: AbortSignal) =>
    request<T>(url, { method: "POST", body: formData, signal }),
  async text(url: string, signal?: AbortSignal): Promise<string> {
    const response = await fetch(`${runtimeConfig.API_BASE}${url}`, {
      headers: { "Accept-Language": currentLanguage() },
      credentials: "same-origin",
      ...(signal ? { signal } : {}),
    });
    if (response.status === 401) {
      location.replace(loginUrl());
      throw new ApiError(401);
    }
    if (!response.ok) throw await parseError(response);
    return response.text();
  },
};

export interface ServerSentEvent<T = unknown> {
  event: string;
  data: T;
  id?: string;
}

export async function* streamEvents<T = unknown>(
  url: string,
  init: RequestInit = {},
): AsyncGenerator<ServerSentEvent<T>> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "text/event-stream");
  headers.set("Accept-Language", currentLanguage());
  const response = await fetch(`${runtimeConfig.API_BASE}${url}`, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) throw await parseError(response);
  if (!response.body) throw new ApiError(500, "El navegador no expone el stream de respuesta");

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? "";
      for (const block of blocks) {
        let event = "message";
        let id: string | undefined;
        const data: string[] = [];
        for (const line of block.split(/\r?\n/)) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("id:")) id = line.slice(3).trim();
          else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
        }
        if (data.length === 0) continue;
        const raw = data.join("\n");
        let parsed: T;
        try {
          parsed = JSON.parse(raw) as T;
        } catch {
          parsed = raw as T;
        }
        yield id === undefined ? { event, data: parsed } : { event, data: parsed, id };
      }
    }
  } finally {
    reader.releaseLock();
  }
}
