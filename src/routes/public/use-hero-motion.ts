import { useCallback, useEffect, useState } from "react";

/**
 * Movimiento del hero de la portada.
 *
 * Dos reglas condicionan el diseño de estos hooks:
 *
 * 1. Con `prefers-reduced-motion: reduce` no se mueve nada. No es solo
 *    accesibilidad: las capturas de Playwright y la auditoría axe se toman con
 *    ese ajuste, así que la animación tiene que quedar congelada en su estado
 *    final o las referencias visuales bailarían en cada ejecución.
 * 2. El estado pintado por React es siempre el final. `scripts/prerender.mjs`
 *    congela el HTML con un Chromium real; si el contador viviera en estado de
 *    React empezando en cero, el HTML servido diría cero.
 */
function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Índice que avanza en bucle cada `intervalMs`. Se queda en 0 sin movimiento. */
export function useRotatingIndex(length: number, intervalMs: number) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (length < 2 || prefersReducedMotion()) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % length),
      intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [length, intervalMs]);

  return index;
}

/**
 * Cuenta de 0 a `target` cuando el elemento entra en pantalla.
 *
 * Devuelve una ref de callback y escribe el número directamente en el nodo.
 * No usa estado a propósito: un contador en estado de React provoca sesenta
 * renders por segundo del árbol entero, y además dejaría el valor inicial —
 * cero— dentro del HTML congelado por el prerenderizado. Así React pinta
 * siempre la cifra final y la animación solo la sobreescribe en el DOM.
 */
export function useCountUp(target: number, durationMs: number) {
  return useCallback(
    (node: HTMLElement | null) => {
      if (!node || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;

      let frame = 0;
      node.textContent = "0";

      const step = (now: number, start: number) => {
        const progress = Math.min((now - start) / durationMs, 1);
        // easeOutCubic: arranca rápido y frena, que es como se lee un contador.
        node.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame((next) => step(next, start));
      };

      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          frame = requestAnimationFrame((now) => step(now, now));
        },
        { threshold: 0.4 },
      );
      observer.observe(node);

      return () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        node.textContent = String(target);
      };
    },
    [target, durationMs],
  );
}
