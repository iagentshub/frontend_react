/* eslint-disable react-refresh/only-export-components -- glyph metadata is shared by the icon pickers */
import type { SVGProps } from "react";

export type SkillCategory =
  "ai" | "messaging" | "notes" | "productivity" | "dev" | "security" | "media" | "data" | "company";

export type AgentIconName =
  "assistant" | "spark" | "code" | "research" | "analytics" | "writer" | "support" | "automation";

export const agentIconOptions: ReadonlyArray<{ value: AgentIconName; label: string }> = [
  { value: "assistant", label: "Asistente" },
  { value: "spark", label: "Especialista" },
  { value: "code", label: "Desarrollo" },
  { value: "research", label: "Investigación" },
  { value: "analytics", label: "Análisis" },
  { value: "writer", label: "Contenido" },
  { value: "support", label: "Soporte" },
  { value: "automation", label: "Automatización" },
];

const agentIconNames = new Set<string>(agentIconOptions.map(({ value }) => value));

export function normalizeAgentIcon(value?: string | null): AgentIconName {
  return value && agentIconNames.has(value) ? (value as AgentIconName) : "assistant";
}

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function AgentGlyph({
  icon,
  size = 20,
  ...props
}: IconProps & { icon?: string | null | undefined }) {
  switch (normalizeAgentIcon(icon)) {
    case "spark":
      return (
        <Svg size={size} {...props}>
          <path d="m12 3 1.45 4.05L17.5 8.5l-4.05 1.45L12 14l-1.45-4.05L6.5 8.5l4.05-1.45L12 3Z" />
          <path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
          <path d="m5 14 .65 1.85 1.85.65-1.85.65L5 19l-.65-1.85-1.85-.65 1.85-.65L5 14Z" />
        </Svg>
      );
    case "code":
      return (
        <Svg size={size} {...props}>
          <path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M14 4l-4 16" />
        </Svg>
      );
    case "research":
      return (
        <Svg size={size} {...props}>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5M8 10.5h5M10.5 8v5" />
        </Svg>
      );
    case "analytics":
      return (
        <Svg size={size} {...props}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
          <path d="m4 7 5-3 6 5 5-5" />
        </Svg>
      );
    case "writer":
      return (
        <Svg size={size} {...props}>
          <path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
          <path d="m14.5 6.7 3 3M4 4h7" />
        </Svg>
      );
    case "support":
      return (
        <Svg size={size} {...props}>
          <path d="M4 13v-2a8 8 0 0 1 16 0v2" />
          <path d="M4 13a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2ZM20 13a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2ZM17 19c-1 1-2.5 1.5-4.5 1.5" />
        </Svg>
      );
    case "automation":
      return (
        <Svg size={size} {...props}>
          <circle cx="5" cy="12" r="2.5" />
          <circle cx="19" cy="6" r="2.5" />
          <circle cx="19" cy="18" r="2.5" />
          <path d="M7.5 12h3.2a3 3 0 0 0 2.7-1.7l2.2-3.1M7.5 12h3.2a3 3 0 0 1 2.7 1.7l2.2 3.1" />
        </Svg>
      );
    default:
      return (
        <Svg size={size} {...props}>
          <rect x="4" y="7" width="16" height="13" rx="4" />
          <path d="M9 7V5.5a3 3 0 0 1 6 0V7M8.5 13h.01M15.5 13h.01M9 17h6" />
        </Svg>
      );
  }
}

export function SkillCategoryGlyph({
  category,
  size = 20,
  ...props
}: IconProps & { category?: string | null | undefined }) {
  switch (category) {
    case "ai":
      return (
        <Svg size={size} {...props}>
          <rect x="5" y="7" width="14" height="12" rx="3" />
          <path d="M12 3v4M8.5 12h.01M15.5 12h.01M9 16h6M3 11h2M19 11h2" />
        </Svg>
      );
    case "messaging":
      return (
        <Svg size={size} {...props}>
          <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-5 4v-4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          <path d="M7 9h10M7 13h6" />
        </Svg>
      );
    case "notes":
      return (
        <Svg size={size} {...props}>
          <path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M14 3v5h5M8 12h8M8 16h6" />
        </Svg>
      );
    case "productivity":
      return (
        <Svg size={size} {...props}>
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <path d="m8 12 2.5 2.5L16.5 9" />
        </Svg>
      );
    case "dev":
      return (
        <Svg size={size} {...props}>
          <path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M14 4l-4 16" />
        </Svg>
      );
    case "security":
      return (
        <Svg size={size} {...props}>
          <path d="M12 3 5 6v5c0 4.5 2.8 8.1 7 10 4.2-1.9 7-5.5 7-10V6l-7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </Svg>
      );
    case "media":
      return (
        <Svg size={size} {...props}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="m10 9 5 3-5 3V9Z" />
        </Svg>
      );
    case "data":
      return (
        <Svg size={size} {...props}>
          <ellipse cx="12" cy="5.5" rx="7" ry="3" />
          <path d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </Svg>
      );
    case "company":
      return (
        <Svg size={size} {...props}>
          <path d="M4 21V7l8-4 8 4v14M2 21h20M8 9h2M14 9h2M8 13h2M14 13h2M10 21v-4h4v4" />
        </Svg>
      );
    default:
      return (
        <Svg size={size} {...props}>
          <path d="M12 3v18M3 12h18" />
          <circle cx="12" cy="12" r="8" />
        </Svg>
      );
  }
}
