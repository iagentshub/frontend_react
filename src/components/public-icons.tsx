import type { ReactNode } from "react";

/**
 * Iconos de línea de las páginas públicas.
 *
 * Un glifo por concepto. La versión anterior agrupaba nombres con
 * `includes()` y veinticinco conceptos acababan compartiendo ocho dibujos:
 * "Multi-agente" y "Grupos de trabajo" salían con el mismo icono de personas,
 * uno al lado del otro en la misma cuadrícula. Dos cosas distintas con el
 * mismo símbolo se leen como la misma cosa.
 *
 * Los nombres del stack tecnológico (python, docker, …) ya no están: eran
 * genéricos y no aportaban nada al lado del nombre escrito. Esa lista va sin
 * iconos.
 */
export type PublicIconName =
  // Funcionalidades (landing y about)
  | "multi_agent"
  | "providers"
  | "selfhosted"
  | "knowledge"
  | "groups"
  | "export"
  | "skills"
  | "dashboard"
  | "centinel"
  | "llm_orchestration"
  | "workflows"
  | "official_resources"
  // Secciones de documentación
  | "keywords"
  | "getting_started"
  | "agents"
  | "connections"
  | "teams"
  | "memory_knowledge"
  | "best_practices"
  // Páginas legales
  | "legal";

const bot = (
  <>
    <rect x="4" y="8" width="16" height="11" rx="3" />
    <path d="M12 4.6v3.4M9.6 13h.01M14.4 13h.01M8 19v2M16 19v2" />
    <circle cx="12" cy="3.4" r="1.1" />
  </>
);

const plug = <path d="M9 2.5v5.5M15 2.5v5.5M6 8h12v3.2a6 6 0 0 1-12 0V8ZM12 17.2v4.3" />;

const people = (
  <>
    <circle cx="8" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M2.8 19c.5-4 2.3-6 5.2-6s4.8 2 5.2 6M14 14c3.7-.8 6.2 1 6.8 4" />
  </>
);

const book = (
  <>
    <path d="M12 6.4C10.4 4.9 8.4 4.2 4 4.4v13c4.4-.2 6.4.5 8 2 1.6-1.5 3.6-2.2 8-2v-13c-4.4-.2-6.4.5-8 2Z" />
    <path d="M12 6.4v13" />
  </>
);

/**
 * Concepto → dibujo. Los alias comparten glifo a propósito porque nombran lo
 * mismo en páginas distintas (`agents` en docs es `multi_agent` en la landing)
 * y nunca coinciden en la misma pantalla.
 */
const PATHS: Record<PublicIconName, ReactNode> = {
  multi_agent: bot,
  agents: bot,

  providers: plug,
  connections: plug,

  groups: people,
  teams: people,

  knowledge: book,
  memory_knowledge: book,

  selfhosted: (
    <>
      <rect x="3" y="4" width="18" height="6" rx="2" />
      <rect x="3" y="14" width="18" height="6" rx="2" />
      <path d="M7 7h.01M7 17h.01M11 7h6M11 17h6" />
    </>
  ),

  export: <path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />,

  skills: (
    <path d="M15.6 3.4a5 5 0 0 0-4.9 8.1l-6.9 6.9a2 2 0 0 0 2.8 2.8l6.9-6.9a5 5 0 0 0 5.9-6.8l-2.9 2.9-2.9-.7-.7-2.9 2.7-2.7Z" />
  ),

  dashboard: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M7.5 15.8v-3.2M12 15.8v-6.4M16.5 15.8v-4.4" />
    </>
  ),

  centinel: (
    <>
      <path d="M12 2.5 5 5.3v5.9c0 4.6 2.8 8.4 7 10.3 4.2-1.9 7-5.7 7-10.3V5.3l-7-2.8Z" />
      <path d="m8.6 12 2.2 2.2 4.6-4.8" />
    </>
  ),

  llm_orchestration: (
    <>
      <circle cx="5" cy="12" r="2.2" />
      <circle cx="19" cy="6" r="2.2" />
      <circle cx="19" cy="18" r="2.2" />
      <path d="M7.2 12h3.3a3 3 0 0 0 2.5-1.4l2.4-3.2M13 13.4l2.4 3.2" />
    </>
  ),

  workflows: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="15" y="15" width="6" height="6" rx="1.5" />
      <path d="M9 6h3a3 3 0 0 1 3 3v6M12 12h3" />
    </>
  ),

  official_resources: (
    <>
      <path d="M12 2.8 19 6v5.2c0 4.5-2.8 8.1-7 10-4.2-1.9-7-5.5-7-10V6l7-3.2Z" />
      <path d="m8.7 12 2.1 2.1 4.5-4.6" />
    </>
  ),

  keywords: (
    <>
      <path d="M3.5 11.6V4.5a1 1 0 0 1 1-1h7.1a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 0 1.4l-7.1 7.1a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1-.3-.7Z" />
      <circle cx="8" cy="8" r="1.3" />
    </>
  ),

  getting_started: <path d="M5.5 21.5V3M5.5 4h11.8l-2.2 3.9 2.2 3.9H5.5" />,

  best_practices: (
    <>
      <path d="M9 4.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6.5a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="2.6" width="6" height="3.8" rx="1.2" />
      <path d="m9.4 13.6 2.1 2.1 3.6-4.2" />
    </>
  ),

  legal: (
    <>
      <path d="M12 3.2v17.6M7.5 20.8h9M12 6.2 5.2 8.1M12 6.2l6.8 1.9" />
      <path d="M5.2 8.1 2.8 14a2.4 2.4 0 0 0 4.8 0L5.2 8.1Zm13.6 0L16.4 14a2.4 2.4 0 0 0 4.8 0l-2.4-5.9Z" />
    </>
  ),
};

/** Iconos de línea que heredan el acento del tema activo. */
export function PublicIcon({ name }: { name: PublicIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      {PATHS[name]}
    </svg>
  );
}
