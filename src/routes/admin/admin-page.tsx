import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { AdminConfigPanel, AdminOverview } from "./admin-overview-config";
import { AdminAgentsPanel, AdminConnectionsPanel, AdminKnowledgePanel, AdminUsersPanel, AdminWorkspacesPanel } from "./admin-resource-panels";
import type { AdminAgent, AdminConnection, AdminData, AdminKnowledge, AdminStats, AdminUser, AdminWorkspace, PlatformConfig } from "./types";
import "@/styles/routes/admin/admin.css";

type AdminTab = "general" | "users" | "workspaces" | "agents" | "connections" | "knowledge" | "config";
const tabs: Array<[AdminTab, string]> = [["general", "General"], ["users", "Usuarios"], ["workspaces", "Grupos"], ["agents", "Agentes"], ["connections", "Conexiones"], ["knowledge", "Conocimiento"], ["config", "Configuración"]];

async function loadAdmin(signal: AbortSignal): Promise<AdminData> {
  const [stats, users, workspaces, agents, connections, knowledge, config] = await Promise.all([
    api.get<AdminStats>("/api/admin/stats", signal), api.get<AdminUser[]>("/api/admin/users", signal), api.get<AdminWorkspace[]>("/api/admin/workspaces", signal), api.get<AdminAgent[]>("/api/admin/agents", signal), api.get<AdminConnection[]>("/api/admin/connections", signal), api.get<AdminKnowledge[]>("/api/admin/knowledge", signal), api.get<PlatformConfig>("/api/settings/platform", signal),
  ]);
  return { stats, users, workspaces, agents, connections, knowledge, config };
}

export function AdminPage() {
  const [params, setParams] = useSearchParams();
  const query = useQuery({ queryKey: ["admin", "panel"], queryFn: ({ signal }) => loadAdmin(signal), refetchInterval: 60_000 });
  const requested = params.get("tab") as AdminTab | null;
  const active = tabs.some(([id]) => id === requested) ? requested as AdminTab : "general";
  const reload = () => { void query.refetch(); };
  return <main className="page-content">
    <div className="page-header"><div><h1 className="page-title">Administración</h1><p className="page-subtitle">Panel de control del sistema</p></div><div className="admin-refresh"><span className="refresh-label">{query.dataUpdatedAt ? `Actualizado ${new Date(query.dataUpdatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : "Sin actualizar"}</span><button className="btn btn-ghost btn-sm" title="Actualizar ahora" disabled={query.isFetching} onClick={reload}>↺</button></div></div>
    <div className="admin-tabs" role="tablist">{tabs.map(([id, label]) => <button key={id} className={`admin-tab${active === id ? " active" : ""}`} role="tab" aria-selected={active === id} onClick={() => setParams({ tab: id })}>{label}</button>)}</div>
    {query.isPending && <div className="admin-empty">Cargando datos de administración…</div>}
    {query.isError && <div className="admin-empty"><p>No se pudo cargar el panel.</p><button className="btn btn-primary" onClick={reload}>Reintentar</button></div>}
    {query.data && <div className="admin-tab-panel">
      {active === "general" && <AdminOverview stats={query.data.stats} />}
      {active === "users" && <AdminUsersPanel users={query.data.users} allowCreate={query.data.config.registration === "closed" || query.data.config.registration === "invite"} onReload={reload} />}
      {active === "workspaces" && <AdminWorkspacesPanel workspaces={query.data.workspaces} onReload={reload} />}
      {active === "agents" && <AdminAgentsPanel agents={query.data.agents} onReload={reload} />}
      {active === "connections" && <AdminConnectionsPanel connections={query.data.connections} onReload={reload} />}
      {active === "knowledge" && <AdminKnowledgePanel items={query.data.knowledge} onReload={reload} />}
      {active === "config" && <AdminConfigPanel initial={query.data.config} onSaved={reload} />}
    </div>}
  </main>;
}

