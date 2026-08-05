const configuredAppBase = import.meta.env.VITE_PRIVATE_APP_URL?.trim();

export const APP_BASE_PATH = (configuredAppBase || "/app").replace(/\/+$/, "");

export function appPath(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${APP_BASE_PATH}${normalized}`;
}
