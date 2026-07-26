import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { AdminConfigPanel, AdminOverview } from "./admin-overview-config";
import {
  AdminAgentsPanel,
  AdminConnectionsPanel,
  AdminKnowledgePanel,
  AdminUsersPanel,
  AdminWorkflowsPanel,
  AdminWorkspacesPanel,
} from "./admin-resource-panels";
import type {
  AdminAgent,
  AdminConnection,
  AdminData,
  AdminKnowledge,
  AdminStats,
  AdminUser,
  AdminWorkflow,
  AdminWorkspace,
  PlatformConfig,
} from "./types";
import "@/styles/routes/admin/admin.css";

type AdminTab =
  | "general"
  | "users"
  | "workspaces"
  | "agents"
  | "connections"
  | "knowledge"
  | "workflows"
  | "config";
const tabs: Array<[AdminTab, string]> = [
  ["general", "admin.tabs.general"],
  ["users", "admin.tabs.users"],
  ["workspaces", "admin.tabs.workspaces"],
  ["agents", "admin.tabs.agents"],
  ["connections", "admin.tabs.connections"],
  ["knowledge", "admin.tabs.knowledge"],
  ["workflows", "admin.tabs.workflows"],
  ["config", "admin.tabs.config"],
];

async function loadAdmin(signal: AbortSignal): Promise<AdminData> {
  const [stats, users, workspaces, agents, connections, knowledge, workflows, config] =
    await Promise.all([
      api.get<AdminStats>("/api/admin/stats", signal),
      api.get<AdminUser[]>("/api/admin/users", signal),
      api.get<AdminWorkspace[]>("/api/admin/workspaces", signal),
      api.get<AdminAgent[]>("/api/admin/agents", signal),
      api.get<AdminConnection[]>("/api/admin/connections", signal),
      api.get<AdminKnowledge[]>("/api/admin/knowledge", signal),
      api.get<AdminWorkflow[]>("/api/admin/workflows", signal),
      api.get<PlatformConfig>("/api/settings/platform", signal),
    ]);
  return { stats, users, workspaces, agents, connections, knowledge, workflows, config };
}

export function AdminPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const query = useQuery({
    queryKey: ["admin", "panel"],
    queryFn: ({ signal }) => loadAdmin(signal),
    refetchInterval: 60_000,
  });
  const requested = params.get("tab") as AdminTab | null;
  const active = tabs.some(([id]) => id === requested) ? (requested as AdminTab) : "general";
  const reload = () => {
    void query.refetch();
  };
  return (
    <main className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("admin.page.title")}</h1>
          <p className="page-subtitle">{t("legacy.text_733eb5a63243")}</p>
        </div>
        <div className="admin-refresh">
          <span className="refresh-label">
            {query.dataUpdatedAt
              ? t("admin.updated", {
                  time: new Date(query.dataUpdatedAt).toLocaleTimeString(
                    i18n.resolvedLanguage === "en" ? "en" : "es",
                    { hour: "2-digit", minute: "2-digit" },
                  ),
                })
              : t("admin.not_updated")}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            title={t("legacy.text_412040ca70d6")}
            disabled={query.isFetching}
            onClick={reload}
          >
            ↺
          </button>
        </div>
      </div>

      <div className="admin-tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={`admin-tab${active === id ? " active" : ""}`}
            role="tab"
            aria-selected={active === id}
            onClick={() => setParams({ tab: id })}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {query.isPending && <div className="admin-empty">{t("legacy.text_8ac6cfcc2600")}</div>}

      {query.isError && (
        <div className="admin-empty">
          <p>{t("legacy.text_9e3bbbac6324")}</p>
          <button className="btn btn-primary" onClick={reload}>
            {t("legacy.text_adec7b4f2351")}
          </button>
        </div>
      )}

      {query.data && (
        <div className="admin-tab-panel">
          {active === "general" && <AdminOverview stats={query.data.stats} />}

          {active === "users" && (
            <AdminUsersPanel
              users={query.data.users}
              allowCreate={
                query.data.config.registration === "closed" ||
                query.data.config.registration === "invite"
              }
              onReload={reload}
            />
          )}

          {active === "workspaces" && (
            <AdminWorkspacesPanel workspaces={query.data.workspaces} onReload={reload} />
          )}

          {active === "agents" && <AdminAgentsPanel agents={query.data.agents} onReload={reload} />}

          {active === "connections" && (
            <AdminConnectionsPanel connections={query.data.connections} onReload={reload} />
          )}

          {active === "knowledge" && (
            <AdminKnowledgePanel items={query.data.knowledge} onReload={reload} />
          )}

          {active === "workflows" && (
            <AdminWorkflowsPanel workflows={query.data.workflows} onReload={reload} />
          )}

          {active === "config" && <AdminConfigPanel initial={query.data.config} onSaved={reload} />}
        </div>
      )}
    </main>
  );
}
