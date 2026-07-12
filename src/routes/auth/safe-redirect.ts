export function safeRedirect(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard/";
}
