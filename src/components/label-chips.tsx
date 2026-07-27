import { useTranslation } from "react-i18next";

export interface LabelDef {
  key: string;
  color: string;
  i18nKey: string;
}

export interface LabelGroup {
  id: string;
  exclusive: boolean;
  required: boolean;
  i18nKey: string;
  defaultKey?: string;
  labels: LabelDef[];
}

export const LABEL_GROUPS: LabelGroup[] = [
  {
    id: "visibility",
    exclusive: true,
    required: true,
    i18nKey: "labels.group.visibility",
    defaultKey: "private",
    labels: [
      { key: "private", color: "#64748b", i18nKey: "labels.private" },
      { key: "public", color: "#059669", i18nKey: "labels.public" },
    ],
  },
  {
    id: "environment",
    exclusive: true,
    required: false,
    i18nKey: "labels.group.environment",
    labels: [
      { key: "production", color: "#0891b2", i18nKey: "labels.production" },
      { key: "staging", color: "#475569", i18nKey: "labels.staging" },
      { key: "development", color: "#d97706", i18nKey: "labels.development" },
      { key: "test", color: "#7c3aed", i18nKey: "labels.test" },
    ],
  },
  {
    id: "status",
    exclusive: true,
    required: false,
    i18nKey: "labels.group.status",
    labels: [
      { key: "favorite", color: "#f59e0b", i18nKey: "labels.favorite" },
      { key: "draft", color: "#8b5cf6", i18nKey: "labels.draft" },
      { key: "review", color: "#f97316", i18nKey: "labels.review" },
      { key: "deprecated", color: "#ca8a04", i18nKey: "labels.deprecated" },
      { key: "quarantine", color: "#ef4444", i18nKey: "labels.quarantine" },
      { key: "archived", color: "#94a3b8", i18nKey: "labels.archived" },
      { key: "delete", color: "#dc2626", i18nKey: "labels.delete" },
    ],
  },
];

export const LABEL_COLORS: Record<string, string> = Object.fromEntries(
  LABEL_GROUPS.flatMap((group) => group.labels.map((label) => [label.key, label.color])),
);

export function labelGroupId(key: string): string | null {
  for (const group of LABEL_GROUPS) {
    if (group.labels.some((label) => label.key === key)) return group.id;
  }
  return null;
}

export function LabelChips({
  labels,
  hidePrivate = true,
  bare = false,
  style,
}: {
  labels: string[] | undefined;
  hidePrivate?: boolean;
  /** Render just the chip spans, without the wrapping row div (to embed inside an existing row). */
  bare?: boolean;
  style?: React.CSSProperties;
}) {
  const { t } = useTranslation();
  const visible = (labels ?? []).filter(
    (label) => (!hidePrivate || label !== "private") && LABEL_COLORS[label],
  );
  if (!visible.length) return null;
  const chips = visible.map((label) => (
    <span
      className="label-chip"
      style={{ "--lc": LABEL_COLORS[label] } as React.CSSProperties}
      key={label}
    >
      {t(`labels.${label}`)}
    </span>
  ));
  if (bare) return chips;
  return (
    <div className="label-chips-row" style={style}>
      {chips}
    </div>
  );
}

/** Chip de origen del recurso respecto al usuario actual: "Propietario" o "Enlazado". */
export function OriginChip({ originType }: { originType: string | undefined }) {
  const { t } = useTranslation();
  if (!originType) return null;
  const linked = originType === "linked";
  return (
    <span
      className="label-chip"
      style={{ "--lc": linked ? "#0891b2" : "#059669" } as React.CSSProperties}
    >
      {t(linked ? "labels.linked" : "labels.owner")}
    </span>
  );
}
