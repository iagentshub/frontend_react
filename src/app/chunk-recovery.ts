const RELOAD_KEY = "gaia:chunk-reload-at";
const RELOAD_GUARD_MS = 60_000;

/**
 * Vite emite `vite:preloadError` cuando una pestaña antigua intenta descargar
 * un chunk que desapareció tras un despliegue. Una recarga obtiene el HTML
 * revalidado y sus nombres de assets actuales.
 *
 * El guard evita bucles: si la segunda carga falla durante el mismo minuto,
 * dejamos que el error llegue al boundary normal para que siga siendo visible.
 */
export function shouldRecoverChunk(lastReloadAt: number, now: number) {
  return !Number.isFinite(lastReloadAt) || now - lastReloadAt >= RELOAD_GUARD_MS;
}

export function installChunkRecovery(target: Window = window) {
  target.addEventListener("vite:preloadError", (event) => {
    const now = Date.now();
    let lastReloadAt = Number.NaN;
    try {
      lastReloadAt = Number(target.sessionStorage.getItem(RELOAD_KEY));
    } catch {
      // La recuperación sigue funcionando si el navegador bloquea sessionStorage.
    }

    if (!shouldRecoverChunk(lastReloadAt, now)) return;
    event.preventDefault();

    try {
      target.sessionStorage.setItem(RELOAD_KEY, String(now));
    } catch {
      // Sin persistencia no hay guard, pero una recarga sigue siendo preferible.
    }
    target.location.reload();
  });
}
