import { runtimeConfig } from "@/config/runtime";

export type ApiErrorDetail =
  string | Array<{ msg?: string; [key: string]: unknown }> | Record<string, unknown>;

export class ApiError extends Error {
  readonly status: number;
  readonly detail?: ApiErrorDetail;
  readonly code?: string;

  constructor(status: number, detail?: ApiErrorDetail) {
    super(formatError(status, detail));
    this.name = "ApiError";
    this.status = status;
    if (detail !== undefined) this.detail = detail;
    if (
      detail &&
      typeof detail === "object" &&
      !Array.isArray(detail) &&
      typeof detail.code === "string"
    ) {
      this.code = detail.code;
    }
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
  if (Array.isArray(detail))
    return detail.map((entry) => entry.msg ?? JSON.stringify(entry)).join("; ");
  const message = detail.message;
  return typeof message === "string" ? message : JSON.stringify(detail);
}

function currentLanguage(): string {
  return document.documentElement.lang || localStorage.getItem("ga-lang") || "es";
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Token anti-CSRF que el backend deja en una cookie legible por JS.
 *
 * Es la segunda capa: `SameSite=Lax` no cubre un subdominio comprometido, que
 * para el navegador es «el mismo sitio». Una web atacante no puede leer
 * nuestras cookies, así que no puede poner esta cabecera.
 */
function csrfToken(): string | null {
  const value = document.cookie.match(/(?:^|;\s*)ga_csrf=([^;]*)/)?.[1];
  return value ? decodeURIComponent(value) : null;
}

function loginUrl(): string {
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (location.pathname.startsWith("/app/login")) return "/app/login";
  return `/app/login?redirect=${encodeURIComponent(current)}`;
}

async function parseError(response: Response): Promise<ApiError> {
  const payload = (await response.json().catch(() => null)) as { detail?: ApiErrorDetail } | null;
  return new ApiError(response.status, payload?.detail);
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { body: sourceBody, authRedirect = true, signal, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  headers.set("Accept-Language", currentLanguage());

  const method = (requestOptions.method ?? "GET").toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    const token = csrfToken();
    if (token) headers.set("X-CSRF-Token", token);
  }

  let body: BodyInit | undefined;
  if (
    sourceBody instanceof FormData ||
    sourceBody instanceof Blob ||
    typeof sourceBody === "string"
  ) {
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
};
