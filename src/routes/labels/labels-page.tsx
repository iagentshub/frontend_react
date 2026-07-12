import { useTranslation } from "react-i18next";
import "../../../assets/css/labels.css";
import "@/styles/routes/labels/labels-catalog.css";

interface LabelDefinition {
  key: string;
  color: string;
}

interface LabelGroup {
  id: "visibility" | "environment" | "status";
  exclusive: boolean;
  labels: readonly LabelDefinition[];
}

const labelGroups: readonly LabelGroup[] = [
  {
    id: "visibility",
    exclusive: true,
    labels: [
      { key: "private", color: "#64748b" },
      { key: "public", color: "#059669" },
    ],
  },
  {
    id: "environment",
    exclusive: true,
    labels: [
      { key: "production", color: "#0891b2" },
      { key: "staging", color: "#475569" },
      { key: "development", color: "#d97706" },
      { key: "test", color: "#7c3aed" },
    ],
  },
  {
    id: "status",
    exclusive: true,
    labels: [
      { key: "favorite", color: "#f59e0b" },
      { key: "draft", color: "#8b5cf6" },
      { key: "review", color: "#f97316" },
      { key: "deprecated", color: "#ca8a04" },
      { key: "quarantine", color: "#ef4444" },
      { key: "archived", color: "#94a3b8" },
      { key: "delete", color: "#dc2626" },
    ],
  },
] as const;

const originTypes = [
  { key: "owner", color: "#16a34a", className: "origin-badge--owner" },
  { key: "fork", color: "#e65100", className: "origin-badge--fork" },
  { key: "linked", color: "#0ea5e9", className: "origin-badge--linked" },
] as const;

const blocked = new Set(["draft", "quarantine", "archived", "delete"]);

function BehaviorIcon({ kind }: { kind: "block" | "warning" | "automatic" }) {
  if (kind === "block") {
    return (
      <svg width="9" height="9" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M5 7V5a3 3 0 0 1 6 0v2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "automatic") {
    return (
      <svg width="9" height="9" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M13 8A5 5 0 1 1 8 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M8 1l3 2-3 2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2l1.5 3.5 3.8.5-2.7 2.6.6 3.8L8 10.5 4.8 12.4l.6-3.8L2.7 6l3.8-.5L8 2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LabelsPage() {
  const { t } = useTranslation();
  return (
    <main className="page-content labels-page">
      <div className="page-header">
        <h1 className="page-title">{t("labels.catalog.title")}</h1>
      </div>
      <p className="labels-intro">{t("labels.catalog.intro")}</p>
      {labelGroups.map((group) => (
        <section className="lcat-group" key={group.id}>
          <div className="lcat-group-header">
            <span className="lcat-group-title">{t(`labels.group.${group.id}`)}</span>
            <span className="lcat-group-meta">
              {t(group.exclusive ? "labels.group.exclusive_hint" : "labels.group.multi_hint")}
            </span>
          </div>
          <div className="lcat-labels-grid">
            {group.labels.map((label) => (
              <article className="lcat-label-card" key={label.key}>
                <span className="lcat-label-dot" style={{ background: label.color }} />
                <div className="lcat-label-info">
                  <div className="lcat-label-name">{t(`labels.${label.key}`)}</div>
                  <div className="lcat-label-key">{label.key}</div>
                  <div className="lcat-label-desc">{t(`labels.desc.${label.key}`)}</div>
                  {blocked.has(label.key) && (
                    <span className="lcat-label-behavior">
                      <BehaviorIcon kind="block" /> {t("labels.catalog.blocks")}
                    </span>
                  )}
                  {label.key === "deprecated" && (
                    <span
                      className="lcat-label-behavior"
                      style={{
                        color: "var(--warning, #ca8a04)",
                        background: "color-mix(in srgb, #ca8a04 10%, transparent)",
                      }}
                    >
                      <BehaviorIcon kind="warning" /> {t("labels.catalog.warns")}
                    </span>
                  )}
                  {label.key === "private" && (
                    <span className="lcat-label-default">
                      <BehaviorIcon kind="warning" /> {t("labels.catalog.default")}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      <section className="lcat-group">
        <div className="lcat-group-header">
          <span className="lcat-group-title">{t("agents.origin.label")}</span>
          <span className="lcat-group-meta">{t("labels.catalog.origin_computed")}</span>
        </div>
        <div className="lcat-labels-grid">
          {originTypes.map((origin) => (
            <article className="lcat-label-card" key={origin.key}>
              <span className="lcat-label-dot" style={{ background: origin.color }} />
              <div className="lcat-label-info">
                <span
                  className={`origin-badge ${origin.className}`}
                  style={{ marginBottom: 4, display: "inline-block" }}
                >
                  {t(`agents.origin.${origin.key}`)}
                </span>
                <div className="lcat-label-key">{origin.key}</div>
                <div className="lcat-label-desc">{t(`labels.desc.origin_${origin.key}`)}</div>
                <span
                  className="lcat-label-behavior"
                  style={{
                    color: "var(--accent, #6366f1)",
                    background: "color-mix(in srgb, #6366f1 10%, transparent)",
                  }}
                >
                  <BehaviorIcon kind="automatic" /> {t("labels.catalog.origin_computed")}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

