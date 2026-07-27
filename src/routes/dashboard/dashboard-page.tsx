import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
/* eslint-disable react-hooks/refs -- dnd-kit exposes callback refs and transforms during render. */
/* eslint-disable react-hooks/set-state-in-effect -- server-owned settings hydrate local editable state. */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import type {
  ConnectionTest,
  DashboardConfig,
  DashboardData,
  FeedItem,
  FeedResourceType,
  SummaryItem,
  WidgetConfig,
  WidgetId,
  WidgetSize,
} from "./types";
import "@/styles/routes/dashboard/dashboard.css";
import "@/styles/routes/dashboard/widgets/summary/widget.css";
import "@/styles/routes/dashboard/widgets/token-usage/widget.css";
import "@/styles/routes/dashboard/widgets/activity/widget.css";
import "@/styles/routes/dashboard/widgets/conn-status/widget.css";
import "@/styles/routes/dashboard/widgets/recent/widget.css";
import "@/styles/routes/dashboard/widgets/composition/widget.css";
import "@/styles/routes/dashboard/widgets/feed/widget.css";
import "./dashboard-react.css";

const defaults: WidgetId[] = ["summary", "token-usage", "conn-status", "recent"];
const allSummaryItems: SummaryItem[] = [
  "agents",
  "connections",
  "skills",
  "memory",
  "knowledge",
  "workflows",
];
const metadata: Record<WidgetId, { titleKey: string; cols: number; config: WidgetConfig }> = {
  summary: {
    titleKey: "dashboard.widgets.summary",
    cols: 4,
    config: { size: "large", items: allSummaryItems },
  },
  "token-usage": {
    titleKey: "dashboard.widgets.token_usage",
    cols: 2,
    config: { size: "medium", vizType: "bars", groupBy: "connection", scope: "all", limit: 5 },
  },
  "conn-status": {
    titleKey: "dashboard.widgets.connection_status",
    cols: 4,
    config: { size: "large", scope: "all", pageSize: 4 },
  },
  recent: {
    titleKey: "dashboard.widgets.recent",
    cols: 4,
    config: { size: "large", pageSize: 4 },
  },
  activity: {
    titleKey: "dashboard.widgets.activity",
    cols: 4,
    config: { size: "large", days: 14 },
  },
  composition: {
    titleKey: "dashboard.widgets.composition",
    cols: 1,
    config: { size: "small" },
  },
  feed: {
    titleKey: "dashboard.widgets.feed",
    cols: 2,
    config: {
      size: "medium",
      types: ["agent", "skill", "knowledge"],
      limit: 8,
      density: "normal",
    },
  },
};

async function loadDashboard(signal: AbortSignal): Promise<{
  data: DashboardData;
  layout: WidgetId[];
  config: DashboardConfig;
}> {
  const safe = async <T,>(url: string, fallback: T) =>
    api.get<T>(url, signal).catch(() => fallback);
  const [
    agents,
    connections,
    skills,
    memories,
    knowledge,
    workflows,
    tokenDaily,
    layoutRes,
    configRes,
  ] = await Promise.all([
    safe<DashboardData["agents"]>("/api/agents", []),
    safe<DashboardData["connections"]>("/api/connections", []),
    safe<unknown[]>("/api/skills", []),
    safe<unknown[]>("/api/memory", []),
    safe<unknown[]>("/api/knowledge", []),
    safe<unknown[]>("/api/workflows", []),
    safe<DashboardData["tokenDaily"]>("/api/connections/tokens-daily?days=30", []),
    safe<{ layout: string[] | null }>("/api/settings/dashboard-layout", { layout: null }),
    safe<{ config: DashboardConfig }>("/api/settings/dashboard-config", { config: {} }),
  ]);
  const valid = (layoutRes.layout ?? [])
    .map((id) => (id === "token-bars" || id === "token-donut" ? "token-usage" : id))
    .filter((id, index, all): id is WidgetId => id in metadata && all.indexOf(id) === index);
  const config = configRes.config ?? {};
  // Migración: configuraciones de "summary" guardadas antes de que existiera
  // el item "workflows" no lo incluyen en su lista explícita — lo añadimos
  // para que las cuentas ya configuradas también vean la card nueva.
  if (config.summary?.items && !config.summary.items.includes("workflows")) {
    config.summary = { ...config.summary, items: [...config.summary.items, "workflows"] };
  }
  return {
    data: { agents, connections, skills, memories, knowledge, workflows, tokenDaily },
    layout: valid.length ? valid : defaults,
    config,
  };
}

function fmt(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

const summaryMeta: Record<
  SummaryItem,
  { labelKey: string; href: string; value: (data: DashboardData) => number }
> = {
  agents: {
    labelKey: "dashboard.stats.agents",
    href: "/agents/",
    value: (data) => data.agents.length,
  },
  connections: {
    labelKey: "dashboard.stats.connections",
    href: "/connections/",
    value: (data) => data.connections.length,
  },
  skills: {
    labelKey: "dashboard.stats.skills",
    href: "/knowledge/",
    value: (data) => data.skills.length,
  },
  memory: {
    labelKey: "dashboard.stats.memory",
    href: "/memory/",
    value: (data) => data.memories.length,
  },
  knowledge: {
    labelKey: "dashboard.stats.knowledge",
    href: "/knowledge/",
    value: (data) => data.knowledge.length,
  },
  workflows: {
    labelKey: "dashboard.stats.workflows",
    href: "/orchestrations/",
    value: (data) => data.workflows.length,
  },
};

function Summary({ data, config }: { data: DashboardData; config: WidgetConfig }) {
  const { t } = useTranslation();
  const size = config.size ?? "large";
  const keys = config.items?.length ? config.items : allSummaryItems;
  if (size === "small")
    return (
      <div className="w-summary-list">
        {keys.map((key) => {
          const item = summaryMeta[key];
          return (
            <Link className="w-summary-row" to={item.href} key={key}>
              <span className="w-summary-row-val">{item.value(data)}</span>

              <span className="w-summary-row-lbl">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    );
  return (
    <div className="dash-stats">
      {keys.map((key) => {
        const item = summaryMeta[key];
        return (
          <Link
            className={`dash-stat-card${size === "medium" ? " dash-stat-card--compact" : ""}`}
            to={item.href}
            key={key}
          >
            {size === "large" && (
              <div className="dash-stat-icon" aria-hidden="true">
                <SummaryIcon kind={key} />
              </div>
            )}

            <div className="dash-stat-body">
              <div className="dash-stat-value">{item.value(data)}</div>

              <div className="dash-stat-label">{t(item.labelKey)}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function SummaryIcon({ kind }: { kind: SummaryItem }) {
  if (kind === "agents")
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="7" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8" cy="11" r="1.2" fill="currentColor" />
      </svg>
    );
  if (kind === "connections")
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8" cy="13" r="2" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M4 6v2a4 4 0 0 0 4 4m0 0V6m0 6a4 4 0 0 0 4-4V6"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  if (kind === "skills")
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 1.5l1.5 3 3.3.5-2.4 2.3.6 3.3L8 9l-3 1.6.6-3.3L3.2 5l3.3-.5z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (kind === "memory")
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path
          d="M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M10 2v3h3"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 8h5M5.5 10.5h5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  if (kind === "workflows")
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="3" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="13" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="3" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M4.5 3h2A2.5 2.5 0 0 1 9 5.5v0A2.5 2.5 0 0 0 11.5 8H9A2.5 2.5 0 0 0 6.5 10.5v0A2.5 2.5 0 0 1 4 13H4.5"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    );
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 13V3.5A1.5 1.5 0 0 1 3.5 2H13v11H3.5A1.5 1.5 0 0 1 2 11.5v0A1.5 1.5 0 0 1 3.5 10H13"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 5.5h4M5.5 7.5h3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface TokenRow {
  name: string;
  sub: string;
  total: number;
}
const chartColors = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#7c3aed", "#db2777"];

function tokenRows(data: DashboardData, config: WidgetConfig): TokenRow[] {
  const connections =
    config.scope === "personal"
      ? data.connections.filter(
          (connection) => connection._personal_key || connection.scope === "personal",
        )
      : data.connections;
  if (config.groupBy === "agent") {
    const allowed = new Set(connections.map((connection) => connection.id));
    return data.agents
      .filter(
        (agent) =>
          config.scope !== "personal" || !agent.connection_id || allowed.has(agent.connection_id),
      )
      .map((agent) => ({
        name: agent.name ?? "Agente",
        sub: agent.model ?? "",
        total: (agent.tokens_in ?? 0) + (agent.tokens_out ?? 0),
      }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);
  }
  return connections
    .map((connection) => ({
      name: connection.name ?? connection.type ?? i18n.t("common.resource_type.connection"),
      sub: connection.type ?? "",
      total: (connection.tokens_in ?? 0) + (connection.tokens_out ?? 0),
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);
}

function Donut({ rows, total, rich }: { rows: TokenRow[]; total: number; rich: boolean }) {
  const stops = rows.map((row, index) => {
    const start = total
      ? (rows.slice(0, index).reduce((sum, item) => sum + item.total, 0) / total) * 100
      : 0;
    const end = start + (total ? (row.total / total) * 100 : 0);
    return `${chartColors[index % chartColors.length]} ${start}% ${end}%`;
  });
  return (
    <div className="w-donut-wrap">
      <div className="dash-donut" style={{ background: `conic-gradient(${stops.join(",")})` }}>
        <span>{fmt(total)}</span>
      </div>

      <div className={`w-donut-legend${rich ? " w-donut-legend--rich" : ""}`}>
        {rows.map((row, index) => (
          <div className="w-donut-legend-item" key={row.name}>
            <span
              className="w-donut-dot"
              style={{ background: chartColors[index % chartColors.length] }}
            />

            <div className="w-donut-legend-info">
              <div className="w-donut-legend-head">
                <span className="w-donut-legend-name">{row.name}</span>

                {rich && (
                  <span className="w-donut-legend-pct">
                    {Math.round((row.total / total) * 100)}%
                  </span>
                )}

                <span className="w-donut-legend-val">{fmt(row.total)}</span>
              </div>

              {rich && (
                <div className="w-donut-legend-track">
                  <div
                    className="w-donut-legend-fill"
                    style={{
                      width: `${(row.total / total) * 100}%`,
                      background: chartColors[index % chartColors.length],
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tokens({ data, config }: { data: DashboardData; config: WidgetConfig }) {
  const { t } = useTranslation();
  const size = config.size ?? "medium";
  const limit = size === "large" ? (config.limit ?? 5) : 3;
  const rows = tokenRows(data, config).slice(0, limit);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const max = rows[0]?.total ?? 1;
  if (!rows.length) return <div className="dash-empty">{t("legacy.text_64d89b4c5ec6")}</div>;
  return (
    <>
      <div className="w-token-total-row">
        <span className="w-token-total-value">{fmt(total)}</span>

        <span className="w-token-total-label">{t("legacy.text_3391436a4e72")}</span>
      </div>

      {config.vizType === "donut" ? (
        <Donut rows={rows} total={total} rich={size === "large"} />
      ) : (
        <div className="w-token-list">
          {rows.map((row) => (
            <div className="w-token-row" key={row.name}>
              <div className="w-token-row-head">
                <span className="w-token-name-wrap">
                  <span className="w-token-name">{row.name}</span>

                  {size === "large" && row.sub && <span className="w-token-sub">{row.sub}</span>}
                </span>

                <span className="w-token-amount">{fmt(row.total)}</span>
              </div>

              <div className="w-token-track">
                <div className="w-token-fill" style={{ width: `${(row.total / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Pager({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total <= 1) return null;
  return (
    <div className="w-pager">
      <button className="w-pager-btn" disabled={page === 0} onClick={() => onChange(page - 1)}>
        ←
      </button>

      <span className="w-pager-label">
        {page + 1} / {total}
      </span>

      <button
        className="w-pager-btn"
        disabled={page >= total - 1}
        onClick={() => onChange(page + 1)}
      >
        →
      </button>
    </div>
  );
}

function Recent({ data, config }: { data: DashboardData; config: WidgetConfig }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const all = data.agents.slice().reverse();
  const pageSize = config.pageSize ?? 4;
  const pages = Math.max(1, Math.ceil(all.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const items = all.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const size = config.size ?? "large";
  if (!items.length) return <div className="dash-empty">{t("legacy.text_263125eeed1f")}</div>;
  return (
    <>
      <div
        className={
          size === "small"
            ? "w-recent-list"
            : `w-recent-grid${size === "medium" ? " w-recent-grid--2col" : ""}`
        }
      >
        {items.map((agent) => (
          <Link
            to={`/agents/?agent=${encodeURIComponent(agent.id)}`}
            className={
              size === "small"
                ? "w-recent-item"
                : `w-recent-card${size === "medium" ? " w-recent-card--compact" : ""}`
            }
            key={agent.id}
          >
            <span className={size === "small" ? "w-recent-item-name" : "w-recent-name"}>
              {agent.name ?? "Agente"}
            </span>

            {agent.model && (
              <span className={size === "small" ? "w-recent-item-model" : "w-recent-model"}>
                {agent.model}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="w-widget-footer">
        <Pager page={safePage} total={pages} onChange={setPage} />
      </div>
    </>
  );
}

function Activity({ data, config }: { data: DashboardData; config: WidgetConfig }) {
  const { t } = useTranslation();
  const size = config.size ?? "large";
  const days = size === "small" ? 7 : size === "medium" ? 14 : (config.days ?? 14);
  const daily = data.tokenDaily.slice(-days);
  const total = daily.reduce((sum, item) => sum + (item.tokens ?? 0), 0);
  const max = Math.max(0, ...daily.map((item) => item.tokens ?? 0));
  if (!daily.length) return <div className="dash-empty">{t("legacy.text_c4a340a1d597")}</div>;
  const bars = (
    <div
      className={`w-activity-histo${size === "small" ? " w-activity-histo--mini" : size === "medium" ? " w-activity-histo--md" : ""}`}
    >
      {daily.map((item, index) => (
        <div
          key={`${item.day ?? item.date}-${index}`}
          className="w-activity-bar"
          title={`${item.day ?? item.date ?? ""}: ${item.tokens ?? 0} tokens`}
          style={{
            height: `${max ? Math.max(size === "small" ? 4 : 2, ((item.tokens ?? 0) / max) * 100) : 4}%`,
          }}
        />
      ))}
    </div>
  );
  if (size === "small")
    return (
      <>
        <div className="w-activity-hero">
          <span className="w-activity-hero-val">{fmt(total)}</span>

          <span className="w-activity-hero-lbl">
            {t("legacy.text_84207af36787")}
            {days} {t("legacy.text_fe85bc9ede26")}
          </span>
        </div>

        {max > 0 && bars}
      </>
    );
  if (!max)
    return (
      <div className="dash-empty">
        {t("legacy.text_b10308a5c4cd")}
        {days} {t("legacy.text_fe85bc9ede26")}
      </div>
    );
  return (
    <>
      {bars}

      <div className="w-activity-foot">
        <span className="w-activity-foot-label">{daily[0]?.day ?? daily[0]?.date}</span>

        <span className="w-activity-foot-label">{daily.at(-1)?.day ?? daily.at(-1)?.date}</span>
      </div>
    </>
  );
}

function Composition({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const counts = new Map<string, number>();
  data.connections.forEach((connection) => {
    const key = (connection.type ?? "other").toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  data.agents.forEach((agent) => {
    const key = (agent.model ?? "other").toLowerCase().split(/[-/]/)[0] ?? "other";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const rows = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = rows[0]?.[1] ?? 1;
  return rows.length ? (
    <div className="w-comp-list">
      {rows.map(([name, count], index) => (
        <div className="w-comp-row" key={name}>
          <div className="w-comp-row-head">
            <span className="w-comp-type-name">{name}</span>

            <span className="w-comp-type-pct">{count}</span>
          </div>

          <div className="w-comp-track">
            <div
              className="w-comp-fill"
              style={{
                width: `${(count / max) * 100}%`,
                background: chartColors[index % chartColors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="dash-empty">{t("legacy.text_0601295f9dd0")}</div>
  );
}

function Connections({ data, config }: { data: DashboardData; config: WidgetConfig }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const connections =
    config.scope === "personal"
      ? data.connections.filter(
          (connection) => connection._personal_key || connection.scope === "personal",
        )
      : data.connections;
  const test = useMutation({
    mutationFn: () =>
      api.post<ConnectionTest[]>("/api/connections/test-all", {
        ids: connections.map((connection) => connection.id),
      }),
  });
  useEffect(() => {
    if (connections.length) test.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!connections.length) return <div className="dash-empty">{t("legacy.text_0a1a79254c50")}</div>;
  const results = new Map(test.data?.map((result) => [result.id, result]));
  const size = config.size ?? "large";
  const pageSize = config.pageSize ?? 4;
  const pages = Math.max(1, Math.ceil(connections.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible =
    size === "large"
      ? connections.slice(safePage * pageSize, (safePage + 1) * pageSize)
      : connections;
  const ok = test.data?.filter((result) => result.ok).length ?? 0;
  if (size === "small")
    return (
      <>
        <div className="w-cs-hero">
          <span
            className={`w-cs-dot ${test.isPending ? "w-cs-dot--pending" : ok === connections.length ? "w-cs-dot--ok" : "w-cs-dot--error"}`}
          />

          <span className="w-cs-hero-val">
            {test.isPending ? "…" : ok}
            <span className="w-cs-hero-sep">/ {connections.length}</span>
          </span>

          <span className="w-cs-hero-lbl">{t("legacy.text_d1a75b61ee02")}</span>
        </div>

        <div className="w-widget-footer">
          <button className="w-cs-refresh" onClick={() => test.mutate()}>
            {t("admin.metadata.refresh_btn")}
          </button>
        </div>
      </>
    );
  const rows = visible.map((connection) => {
    const result = results.get(connection.id);
    return (
      <div className={size === "medium" ? "w-cs-compact-row" : "w-cs-card"} key={connection.id}>
        <div className={size === "medium" ? undefined : "w-cs-card-head"}>
          <span
            className={`w-cs-dot ${!result ? "w-cs-dot--pending" : result.ok ? "w-cs-dot--ok" : "w-cs-dot--error"}`}
          />

          <span className={size === "medium" ? "w-cs-compact-name" : "w-cs-name"}>
            {connection.name ?? connection.type ?? connection.id}
          </span>
        </div>

        <span className={size === "medium" ? "w-cs-compact-status" : "w-cs-msg"}>
          {result?.message ?? (test.isError ? t("common.ui.error") : t("common.ui.checking"))}
        </span>
      </div>
    );
  });
  return (
    <>
      <div className={size === "medium" ? "w-cs-compact" : "w-cs-grid"}>{rows}</div>

      <div className="w-widget-footer">
        <span className="w-cs-summary">
          {test.data
            ? `${ok} / ${connections.length} OK`
            : `Comprobando ${connections.length} conexiones…`}
        </span>

        {size === "large" && <Pager page={safePage} total={pages} onChange={setPage} />}

        <button className="w-cs-refresh" onClick={() => test.mutate()}>
          {t("admin.metadata.refresh_btn")}
        </button>
      </div>
    </>
  );
}

function relativeDate(value?: string): string {
  if (!value) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).valueOf()) / 60_000));
  if (minutes < 60) return `hace ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `hace ${hours}h` : `hace ${Math.floor(hours / 24)}d`;
}

function Feed({ config }: { config: WidgetConfig }) {
  const { t } = useTranslation();
  const types = config.types ?? ["agent", "skill", "knowledge"];
  const limit = config.limit ?? 8;
  const single = types.length === 1 ? types[0] : undefined;
  const fetchLimit = Math.min(100, single ? limit : limit * Math.max(1, types.length));
  const query = useQuery({
    queryKey: ["dashboard", "feed", types, limit],
    queryFn: ({ signal }) =>
      api.get<FeedItem[]>(
        `/api/feed?limit=${fetchLimit}${single ? `&type=${single}` : ""}`,
        signal,
      ),
    staleTime: 30_000,
  });
  const [stars, setStars] = useState<Record<string, { starred: boolean; count: number }>>({});
  const star = useMutation({
    mutationFn: async (item: FeedItem) => {
      const key = `${item.resource_type}:${item.resource_id}`;
      const current = stars[key] ?? {
        starred: Boolean(item.starred),
        count: item.stars_count ?? 0,
      };
      const result = current.starred
        ? await api.delete<{ stars?: number }>(
            `/api/${item.resource_type}/${encodeURIComponent(item.resource_id)}/star`,
          )
        : await api.post<{ stars?: number }>(
            `/api/${item.resource_type}/${encodeURIComponent(item.resource_id)}/star`,
            {},
          );
      return {
        key,
        starred: !current.starred,
        count: result.stars ?? current.count + (current.starred ? -1 : 1),
      };
    },
    onSuccess: (result) =>
      setStars((current) => ({
        ...current,
        [result.key]: { starred: result.starred, count: result.count },
      })),
  });
  if (query.isPending)
    return (
      <div className="wfeed-loading">
        <div className="spinner spinner--sm" />
      </div>
    );
  if (query.isError)
    return (
      <div className="wfeed-empty">
        <p>{t("legacy.text_416a8643ee87")}</p>
      </div>
    );
  const items = (query.data ?? [])
    .filter((item) => !types.length || types.includes(item.resource_type))
    .slice(0, limit);
  if (!items.length)
    return (
      <div className="wfeed-empty">
        <p>
          {t("legacy.text_96a2fb0ade46")} <Link to="/explore/">{t("agents.modal.tab_browse")}</Link>
          .
        </p>
      </div>
    );
  return (
    <div className={`wfeed-list wfeed-list--${config.density ?? "normal"}`}>
      {items.map((item) => {
        const key = `${item.resource_type}:${item.resource_id}`;
        const state = stars[key] ?? {
          starred: Boolean(item.starred),
          count: item.stars_count ?? 0,
        };
        return (
          <div className={`wfeed-card wfeed-card--${config.density ?? "normal"}`} key={key}>
            <div className="wfeed-card-icon" aria-hidden="true">
              {(item.name ?? "?").charAt(0).toUpperCase()}
            </div>

            <div className="wfeed-card-body">
              <div className="wfeed-card-name">{item.name ?? "Recurso"}</div>

              {config.density !== "compact" && item.description && (
                <div className="wfeed-card-desc">{item.description}</div>
              )}

              <div className="wfeed-card-meta">
                <span className="wfeed-badge">{item.resource_type}</span>

                {item.owner && (
                  <Link className="wfeed-author" to={`/u/${encodeURIComponent(item.owner)}`}>
                    @{item.owner}
                  </Link>
                )}

                <span className="wfeed-date">{relativeDate(item.updated_at)}</span>
              </div>
            </div>

            <button
              className={`wfeed-star${state.starred ? " starred" : ""}`}
              disabled={star.isPending}
              onClick={() => star.mutate(item)}
              title={t("legacy.text_85a7de6e2705")}
            >
              ★<span>{state.count}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function SizePicker({
  value,
  onChange,
}: {
  value: WidgetSize;
  onChange: (size: WidgetSize) => void;
}) {
  return (
    <div className="wcfg-sizes">
      {(["small", "medium", "large"] as const).map((size) => (
        <label className="wcfg-size-card" key={size}>
          <input type="radio" checked={value === size} onChange={() => onChange(size)} />

          <span className={`wcfg-size-visual wcfg-size-visual--${size.charAt(0)}`} />

          <span className="wcfg-size-name">
            {size === "small"
              ? i18n.t("dynamic.text_df30c4eb7655")
              : size === "medium"
                ? i18n.t("common.ui.medium")
                : i18n.t("common.ui.large")}
          </span>
        </label>
      ))}
    </div>
  );
}

function RadioPills<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="wcfg-pills">
      {options.map(([option, label]) => (
        <label className="wcfg-pill" key={option}>
          <input type="radio" checked={value === option} onChange={() => onChange(option)} />

          <span className="wcfg-pill-label">{label}</span>
        </label>
      ))}
    </div>
  );
}

function ConfigForm({
  id,
  value,
  onCancel,
  onSave,
}: {
  id: WidgetId;
  value: WidgetConfig;
  onCancel: () => void;
  onSave: (value: WidgetConfig) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<WidgetConfig>(value);
  const set = <K extends keyof WidgetConfig>(key: K, next: WidgetConfig[K]) =>
    setDraft((current) => ({ ...current, [key]: next }));
  const field = (label: string, child: ReactNode) => (
    <div className="wcfg-field">
      <span className="wcfg-label">{label}</span>

      {child}
    </div>
  );
  return (
    <div className="wcfg-body">
      <div className="wcfg-title">{t(metadata[id].titleKey)}</div>

      {id !== "composition" &&
        field(
          i18n.t("dynamic.text_78c6e9b45d94"),
          <SizePicker
            value={draft.size ?? metadata[id].config.size ?? "large"}
            onChange={(size) => set("size", size)}
          />,
        )}

      {id === "summary" &&
        field(
          "Mostrar",
          <div className="wcfg-checks">
            {allSummaryItems.map((item) => (
              <label className="wcfg-check" key={item}>
                <input
                  type="checkbox"
                  checked={(draft.items ?? allSummaryItems).includes(item)}
                  onChange={(event) =>
                    set(
                      "items",
                      event.target.checked
                        ? [...(draft.items ?? []), item]
                        : (draft.items ?? allSummaryItems).filter((key) => key !== item),
                    )
                  }
                />

                {t(summaryMeta[item].labelKey)}
              </label>
            ))}
          </div>,
        )}

      {id === "token-usage" && (
        <>
          {field(
            i18n.t("dynamic.text_585ce519d7d9"),
            <RadioPills
              value={draft.vizType ?? "bars"}
              options={[
                ["bars", "Barras"],
                ["donut", "Donut"],
              ]}
              onChange={(value) => set("vizType", value)}
            />,
          )}

          {field(
            t("dashboard.config.group_by"),
            <RadioPills
              value={draft.groupBy ?? "connection"}
              options={[
                ["connection", i18n.t("dynamic.text_d70cf09dfb27")],
                ["agent", t("dashboard.config.agent")],
              ]}
              onChange={(value) => set("groupBy", value)}
            />,
          )}

          {field(
            t("dashboard.config.connections"),
            <RadioPills
              value={draft.scope ?? "all"}
              options={[
                ["all", t("dashboard.config.all")],
                ["personal", t("dashboard.config.personal")],
              ]}
              onChange={(value) => set("scope", value)}
            />,
          )}

          {field(
            i18n.t("dynamic.text_bba4838a07f9"),
            <select
              className="select select--sm"
              value={draft.limit ?? 5}
              onChange={(event) => set("limit", Number(event.target.value))}
            >
              {[3, 5, 10].map((number) => (
                <option key={number} value={number}>
                  {t("legacy.text_cae0435c41e8")}
                  {number}
                </option>
              ))}
            </select>,
          )}
        </>
      )}

      {id === "conn-status" && (
        <>
          {field(
            t("dashboard.config.connections"),
            <RadioPills
              value={draft.scope ?? "all"}
              options={[
                ["all", t("dashboard.config.all")],
                ["personal", t("dashboard.config.personal")],
              ]}
              onChange={(value) => set("scope", value)}
            />,
          )}

          {field(
            i18n.t("dynamic.text_6eb27a263bff"),
            <select
              className="select select--sm"
              value={draft.pageSize ?? 4}
              onChange={(event) => set("pageSize", Number(event.target.value))}
            >
              {[2, 4, 6, 8].map((number) => (
                <option key={number}>{number}</option>
              ))}
            </select>,
          )}
        </>
      )}

      {id === "recent" &&
        field(
          i18n.t("dynamic.text_9620ad9b8fc3"),
          <select
            className="select select--sm"
            value={draft.pageSize ?? 4}
            onChange={(event) => set("pageSize", Number(event.target.value))}
          >
            {[2, 4, 6, 8].map((number) => (
              <option key={number}>{number}</option>
            ))}
          </select>,
        )}

      {id === "activity" &&
        field(
          "Periodo (solo en Grande)",
          <select
            className="select select--sm"
            value={draft.days ?? 14}
            onChange={(event) => set("days", Number(event.target.value))}
          >
            {[7, 14, 30].map((number) => (
              <option key={number} value={number}>
                {number} {t("legacy.text_fe85bc9ede26")}
              </option>
            ))}
          </select>,
        )}

      {id === "feed" && (
        <>
          {field(
            "Tipos de recurso",
            <div className="wfeed-cfg-type-grid">
              {(["agent", "skill", "knowledge"] as FeedResourceType[]).map((type) => (
                <label className="wfeed-cfg-type-opt" key={type}>
                  <input
                    type="checkbox"
                    checked={(draft.types ?? []).includes(type)}
                    onChange={(event) =>
                      set(
                        "types",
                        event.target.checked
                          ? [...(draft.types ?? []), type]
                          : (draft.types ?? []).filter((item) => item !== type),
                      )
                    }
                  />

                  <span>{t(`common.resource_type_plural.${type}`)}</span>
                </label>
              ))}
            </div>,
          )}

          {field(
            t("dashboard.config.quantity"),
            <select
              className="select select--sm"
              value={draft.limit ?? 8}
              onChange={(event) => set("limit", Number(event.target.value))}
            >
              {[4, 8, 15, 25].map((number) => (
                <option key={number} value={number}>
                  {number} {t("legacy.text_7316c8b2e748")}
                </option>
              ))}
            </select>,
          )}

          {field(
            "Vista",
            <RadioPills
              value={draft.density ?? "normal"}
              options={[
                ["normal", i18n.t("dynamic.text_d4c921358ee5")],
                ["compact", "Compacta — solo nombre y autor"],
              ]}
              onChange={(value) => set("density", value)}
            />,
          )}
        </>
      )}

      {id === "composition" && <p className="wcfg-desc">{t("legacy.text_35c9a8d261c2")}</p>}

      <div className="wcfg-actions">
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          {t("agents.scan.folder_cancel_btn")}
        </button>

        {id !== "composition" && (
          <button className="btn btn-primary btn-sm" onClick={() => onSave(draft)}>
            {t("agents.modal.routine_save")}
          </button>
        )}
      </div>
    </div>
  );
}

function WidgetBody({
  id,
  data,
  config,
}: {
  id: WidgetId;
  data: DashboardData;
  config: WidgetConfig;
}) {
  if (id === "summary") return <Summary data={data} config={config} />;
  if (id === "token-usage") return <Tokens data={data} config={config} />;
  if (id === "conn-status") return <Connections data={data} config={config} />;
  if (id === "recent") return <Recent data={data} config={config} />;
  if (id === "activity") return <Activity data={data} config={config} />;
  if (id === "feed") return <Feed config={config} />;
  return <Composition data={data} />;
}

function Widget({
  id,
  data,
  config,
  editing,
  configuring,
  onConfigure,
  onConfigSave,
  onRemove,
}: {
  id: WidgetId;
  data: DashboardData;
  config: WidgetConfig;
  editing: boolean;
  configuring: boolean;
  onConfigure: () => void;
  onConfigSave: (config: WidgetConfig) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const sortable = useSortable({ id, disabled: !editing || configuring });
  const size = config.size ?? metadata[id].config.size;
  const cols = size === "small" ? 1 : size === "medium" ? 2 : metadata[id].cols;
  return (
    <section
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={`dash-panel ${cols >= 4 ? "dash-panel--full" : cols === 1 ? "dash-panel--small" : "dash-panel--medium"}${editing ? " dash-panel--edit" : ""}`}
      data-flipped={configuring || undefined}
    >
      {editing && !configuring && (
        <div className="dash-editbar">
          <button
            className="dash-drag-handle"
            aria-label={t("dashboard.editor.move_widget", {
              name: t(metadata[id].titleKey),
              defaultValue: "Move {{name}}",
            })}
            {...sortable.attributes}
            {...sortable.listeners}
          >
            ⠿
          </button>

          <span className="dash-editbar-title">{t(metadata[id].titleKey)}</span>

          <div className="dash-editbar-actions">
            <button
              className="dash-config-btn"
              aria-label={t("dashboard.editor.configure_widget", {
                name: t(metadata[id].titleKey),
                defaultValue: "Configure {{name}}",
              })}
              onClick={onConfigure}
            >
              ⚙
            </button>

            <button
              className="dash-remove-btn"
              aria-label={t("dashboard.editor.remove_widget", {
                name: t(metadata[id].titleKey),
                defaultValue: "Remove {{name}}",
              })}
              onClick={onRemove}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {configuring ? (
        <ConfigForm id={id} value={config} onCancel={onConfigure} onSave={onConfigSave} />
      ) : (
        <>
          <div className="dash-panel-title">{t(metadata[id].titleKey)}</div>

          <div className="dash-panel-body">
            <WidgetBody id={id} data={data} config={config} />
          </div>
        </>
      )}
    </section>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: ({ signal }) => loadDashboard(signal),
  });
  const [layout, setLayout] = useState<WidgetId[]>([]);
  const [config, setConfig] = useState<DashboardConfig>({});
  const [editing, setEditing] = useState(false);
  const [configuring, setConfiguring] = useState<WidgetId | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    if (query.data) {
      setLayout(query.data.layout);
      setConfig(query.data.config);
    }
  }, [query.data]);
  useEffect(() => {
    document.body.classList.toggle("dash-editing", editing);
    return () => document.body.classList.remove("dash-editing");
  }, [editing]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const saveLayout = (next: WidgetId[]) => {
    const previous = layout;
    setLayout(next);
    setSaveError(null);
    void api.put("/api/settings/dashboard-layout", { layout: next }).catch((error: Error) => {
      setLayout(previous);
      setSaveError(error.message);
    });
  };
  const saveWidgetConfig = (id: WidgetId, value: WidgetConfig) => {
    const previous = config;
    const next = { ...config, [id]: { ...metadata[id].config, ...value } };
    setConfig(next);
    setConfiguring(null);
    setSaveError(null);
    void api.put("/api/settings/dashboard-config", { config: next }).catch((error: Error) => {
      setConfig(previous);
      setSaveError(error.message);
    });
  };
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = layout.indexOf(active.id as WidgetId);
    const to = layout.indexOf(over.id as WidgetId);
    if (from >= 0 && to >= 0) saveLayout(arrayMove(layout, from, to));
  };
  const available = useMemo(
    () => (Object.keys(metadata) as WidgetId[]).filter((id) => !layout.includes(id)),
    [layout],
  );
  if (query.isPending)
    return (
      <main className="page-content">
        <div className="route-loading">
          <div className="spinner" />
          {t("legacy.text_d401202c6abc")}
        </div>
      </main>
    );
  if (query.isError || !query.data)
    return (
      <main className="page-content">
        <div className="empty-state">
          <h2>{t("legacy.text_9aa428013938")}</h2>

          <button className="btn btn-primary" onClick={() => void query.refetch()}>
            {t("legacy.text_adec7b4f2351")}
          </button>
        </div>
      </main>
    );
  return (
    <>
      <aside
        className="dash-edit-sidebar"
        style={{ display: editing ? "flex" : "none" }}
        aria-hidden={!editing}
      >
        <div className="des-header">
          <span className="des-title">{t("dashboard.customize_title")}</span>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditing(false);
              setConfiguring(null);
            }}
          >
            {t("agents.export.done")}
          </button>
        </div>

        <p className="des-hint">{t("legacy.text_a44e0ab44375")}</p>

        <div className="des-list">
          {available.length ? (
            available.map((id) => (
              <button className="des-item" key={id} onClick={() => saveLayout([...layout, id])}>
                <span className="des-item-header">
                  <span className="des-item-title">{t(metadata[id].titleKey)}</span>

                  <span className="des-item-size">
                    {metadata[id].cols >= 4
                      ? t("common.ui.large")
                      : metadata[id].cols === 1
                        ? i18n.t("dynamic.text_df30c4eb7655")
                        : t("common.ui.medium")}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="des-empty">
              {t("legacy.text_f037ba702304")}
              <br />
              {t("legacy.text_69d90edb75df")}
            </p>
          )}
        </div>
      </aside>

      <main className="page-content">
        <div className="page-header dash-page-header">
          <div>
            <h1 className="page-title">{t("common.nav.dashboard")}</h1>

            <p className="page-subtitle">{t("dashboard.page.subtitle")}</p>
          </div>

          {!editing && (
            <button
              id="btn-edit-dashboard"
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setEditing(true)}
            >
              {t("dashboard.customize_title")}
            </button>
          )}
        </div>

        {saveError && (
          <div className="dashboard-save-error" role="alert">
            {t("legacy.text_41e0bfcaf34f")}
            {saveError}
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
          <SortableContext items={layout} strategy={rectSortingStrategy}>
            <div className="dash-grid">
              {layout.map((id) => (
                <Widget
                  key={id}
                  id={id}
                  data={query.data.data}
                  config={{ ...metadata[id].config, ...config[id] }}
                  editing={editing}
                  configuring={configuring === id}
                  onConfigure={() => setConfiguring((current) => (current === id ? null : id))}
                  onConfigSave={(value) => saveWidgetConfig(id, value)}
                  onRemove={() => {
                    setConfiguring(null);
                    saveLayout(layout.filter((item) => item !== id));
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </main>
    </>
  );
}
