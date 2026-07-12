import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

const labelGroups = [
  {
    id: "visibility",
    required: true,
    labels: [
      { key: "private", color: "#64748b" },
      { key: "public", color: "#059669" },
    ],
  },
  {
    id: "environment",
    required: false,
    labels: [
      { key: "production", color: "#0891b2" },
      { key: "staging", color: "#475569" },
      { key: "development", color: "#d97706" },
      { key: "test", color: "#7c3aed" },
    ],
  },
  {
    id: "status",
    required: false,
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

const labelColor = Object.fromEntries(
  labelGroups.flatMap((group) => group.labels.map((label) => [label.key, label.color])),
) as Record<string, string>;

export function Modal({
  title,
  children,
  onClose,
  width = 600,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: number;
  className?: string;
}) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [onClose]);
  return (
    <div
      className="modal-bg"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal-box ${className}`}
        style={{
          width,
          maxWidth: "96vw",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function LabelChips({
  labels,
  hidePrivate = true,
}: {
  labels?: string[];
  hidePrivate?: boolean;
}) {
  const { t } = useTranslation();
  const shown = (labels ?? []).filter(
    (label) => labelColor[label] && (!hidePrivate || label !== "private"),
  );
  if (!shown.length) return null;
  return (
    <div className="label-chips-row">
      {shown.map((label) => (
        <span
          className="label-chip"
          style={{ "--lc": labelColor[label] } as CSSProperties}
          key={label}
        >
          {t(`labels.${label}`)}
        </span>
      ))}
    </div>
  );
}

export function LabelPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useTranslation();
  const select = (groupId: string, key: string) => {
    const group = labelGroups.find((item) => item.id === groupId);
    if (!group) return;
    const groupKeys = new Set(group.labels.map((item) => item.key));
    const next = value.filter((item) => !groupKeys.has(item as never));
    if (key) next.push(key);
    onChange(next);
  };
  return (
    <div className="knowledge-view-labels">
      {labelGroups.map((group) => {
        const active = value.find((item) => group.labels.some((label) => label.key === item)) ?? "";
        return (
          <label key={group.id}>
            {t(`labels.group.${group.id}`)}
            <span
              className="lbl-select-wrap"
              style={{ "--lc": labelColor[active] ?? "transparent" } as CSSProperties}
            >
              <select
                className="select lbl-select"
                value={active}
                onChange={(event) => select(group.id, event.target.value)}
              >
                {!group.required && <option value="">— {t("labels.none")} —</option>}
                {group.labels.map((label) => (
                  <option value={label.key} key={label.key}>
                    {t(`labels.${label.key}`)}
                  </option>
                ))}
              </select>
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function Icon({
  kind,
}: {
  kind:
    | "plus"
    | "upload"
    | "catalog"
    | "view"
    | "edit"
    | "delete"
    | "share"
    | "export"
    | "fork"
    | "link"
    | "sync"
    | "grid"
    | "list"
    | "groups"
    | "file";
}) {
  if (kind === "plus")
    return (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path
          d="M6.5 1v11M1 6.5h11"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  if (kind === "upload")
    return (
      <svg width="15" height="15" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path
          d="M6.5 8.5V1M3 4l3.5-3L10 4M1 10.5v1a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (kind === "catalog" || kind === "grid")
    return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect
          x="8.5"
          y="1"
          width="5.5"
          height="5.5"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <rect
          x="1"
          y="8.5"
          width="5.5"
          height="5.5"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <rect
          x="8.5"
          y="8.5"
          width="5.5"
          height="5.5"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
    );
  if (kind === "list")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M5.5 4h9M5.5 8h9M5.5 12h9"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="2.5" cy="4" r="1" fill="currentColor" />
        <circle cx="2.5" cy="8" r="1" fill="currentColor" />
        <circle cx="2.5" cy="12" r="1" fill="currentColor" />
      </svg>
    );
  if (kind === "view")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  if (kind === "edit")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="m11 2 3 3-9 9H2v-3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (kind === "delete")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (kind === "share")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="12" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="12" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="4" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="m10.5 3.8-5 3.4m5 5-5-3.4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  if (kind === "export")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 2v8M5 7l3 3 3-3M3 13h10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  if (kind === "fork")
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="3" cy="13.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="13" cy="13.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M8 4v3l-5 5m5-5 5 5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  if (kind === "link")
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7 4M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L9 12"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  if (kind === "sync")
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M13.5 2.5v4h-4M2.5 13.5v-4h4M13.5 6.5A6 6 0 0 0 4 4L2.5 5.5M2.5 9.5A6 6 0 0 0 12 12l1.5-1.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (kind === "groups")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M1.5 13v-.5A3.5 3.5 0 0 1 5 9a3.5 3.5 0 0 1 3.5 3.5V13M9 9.2a3.5 3.5 0 0 1 5.5 3.3v.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const filterLabels = [
  "public",
  "production",
  "staging",
  "development",
  "test",
  "favorite",
  "draft",
  "review",
  "deprecated",
  "quarantine",
  "archived",
  "delete",
];

export function FilterBar({
  query,
  onQuery,
  labels,
  onLabels,
  showLabels = false,
}: {
  query: string;
  onQuery: (value: string) => void;
  labels: string[];
  onLabels: (value: string[]) => void;
  showLabels?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const active = Boolean(query || labels.length);
  return (
    <div className="fa-bar">
      <div className="fa-search-wrap">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.6" />
          <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          className="fa-search-input"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={t("agents.filter.search_placeholder")}
        />
        {query && (
          <button className="fa-search-clear" onClick={() => onQuery("")} aria-label="Limpiar">
            ×
          </button>
        )}
      </div>
      {showLabels && (
        <div className="fa-filter-group">
          <div className="fa-dropdown-wrap" ref={wrap}>
            <button
              className={`fa-filter-btn${labels.length ? " fa-filter-btn--active" : ""}`}
              onClick={() => setOpen((value) => !value)}
            >
              {t("labels.catalog.title")}
              {labels.length > 0 && <span className="fa-filter-count">{labels.length}</span>}⌄
            </button>
            {open && (
              <div className="fa-panel fa-panel--labels">
                <div className="fa-panel-list">
                  {filterLabels.map((label) => {
                    const checked = labels.includes(label);
                    return (
                      <button
                        className={`fa-option${checked ? " fa-option--active" : ""}`}
                        key={label}
                        onClick={() =>
                          onLabels(
                            checked ? labels.filter((item) => item !== label) : [...labels, label],
                          )
                        }
                      >
                        <span className="fa-option-check">{checked ? "✓" : ""}</span>
                        <span className="fa-lbl-dot" style={{ background: labelColor[label] }} />
                        <span className="fa-option-label">{t(`labels.${label}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {active && (
        <button
          className="fa-clear-all"
          onClick={() => {
            onQuery("");
            onLabels([]);
            setOpen(false);
          }}
        >
          {t("actions.clear_filters")}
        </button>
      )}
    </div>
  );
}
