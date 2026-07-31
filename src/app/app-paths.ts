export const APP_BASE_PATH = "/app";

export function appPath(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${APP_BASE_PATH}${normalized}`;
}
