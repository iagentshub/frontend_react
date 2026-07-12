import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "@/api/client";
import "@/styles/routes/admin/admin.css";
import "@/styles/routes/manager/manager.css";

type WorkspaceRole = "owner" | "admin" | "member";

interface Workspace {
  id: string;
  name: string;
  type: "personal" | "team";
  role: WorkspaceRole;
  active?: boolean;
}

interface WorkspaceMember {
  username: string;
  email?: string | null;
  display_name?: string | null;
  role: WorkspaceRole;
  joined_at?: string | null;
}

interface WorkspaceInvitation {
  id: string;
  username: string;
  invited_by?: string;
  created_at?: string | null;
  status?: string;
}

interface ManagerData {
  workspaces: Workspace[];
  workspace: Workspace;
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
}

function errorText(error: unknown): string {
  return error instanceof ApiError ? error.message : "No se pudo completar la operación.";
}

function shortDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : new Intl.DateTimeFormat("es-ES", { dateStyle: "short" }).format(date);
}

async function loadManager(workspaceParam: string | null, signal: AbortSignal): Promise<ManagerData> {
  const workspaces = await api.get<Workspace[]>("/api/workspaces", signal);
  const manageable = workspaces.filter((item) => item.type === "team" && (item.role === "owner" || item.role === "admin"));
  const workspace = manageable.find((item) => item.id === workspaceParam) ?? manageable[0];
  if (!workspace) throw new ApiError(403, "No administras ningún grupo de trabajo.");
  const [members, invitations] = await Promise.all([
    api.get<WorkspaceMember[]>(`/api/workspaces/${encodeURIComponent(workspace.id)}/members`, signal),
    api.get<WorkspaceInvitation[]>(`/api/workspaces/${encodeURIComponent(workspace.id)}/invitations`, signal),
  ]);
  return { workspaces: manageable, workspace, members, invitations };
}

export function ManagerPage() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("team") ?? params.get("workspace");
  const [tab, setTab] = useState<"team" | "invitations">("team");
  const [invite, setInvite] = useState("");
  const query = useQuery({
    queryKey: ["manager", selectedId],
    queryFn: ({ signal }) => loadManager(selectedId, signal),
  });
  const workspaceId = query.data?.workspace.id;

  const inviteMutation = useMutation({
    mutationFn: (username: string) => api.post(`/api/workspaces/${encodeURIComponent(workspaceId ?? "")}/invitations`, { username }),
    onSuccess: async () => {
      setInvite("");
      await query.refetch();
    },
  });
  const roleMutation = useMutation({
    mutationFn: ({ username, role }: { username: string; role: WorkspaceRole }) =>
      api.patch(`/api/workspaces/${encodeURIComponent(workspaceId ?? "")}/members/${encodeURIComponent(username)}`, { role }),
    onSuccess: () => query.refetch(),
  });
  const removeMutation = useMutation({
    mutationFn: (username: string) => api.delete(`/api/workspaces/${encodeURIComponent(workspaceId ?? "")}/members/${encodeURIComponent(username)}`),
    onSuccess: () => query.refetch(),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/workspaces/${encodeURIComponent(workspaceId ?? "")}/invitations/${encodeURIComponent(id)}`),
    onSuccess: () => query.refetch(),
  });
  const operationError = inviteMutation.error ?? roleMutation.error ?? removeMutation.error ?? cancelMutation.error;
  const busy = inviteMutation.isPending || roleMutation.isPending || removeMutation.isPending || cancelMutation.isPending;
  const workspaceOptions = useMemo(() => query.data?.workspaces ?? [], [query.data]);

  return (
    <main className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de gestor</h1>
          <p className="page-subtitle">{query.data?.workspace.name ?? "Gestiona miembros e invitaciones"}</p>
        </div>
        {workspaceOptions.length > 1 && (
          <select
            className="admin-select"
            aria-label="Grupo administrado"
            value={query.data?.workspace.id ?? selectedId ?? ""}
            onChange={(event) => setParams({ team: event.target.value })}
          >
            {workspaceOptions.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </select>
        )}
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Secciones de gestión">
        <button className={`admin-tab${tab === "team" ? " active" : ""}`} role="tab" aria-selected={tab === "team"} onClick={() => setTab("team")}>Equipo</button>
        <button className={`admin-tab${tab === "invitations" ? " active" : ""}`} role="tab" aria-selected={tab === "invitations"} onClick={() => setTab("invitations")}>Invitaciones</button>
      </div>

      {query.isPending && <div className="admin-empty" aria-live="polite">Cargando equipo…</div>}
      {query.isError && (
        <div className="admin-empty" role="alert">
          <p>{errorText(query.error)}</p>
          <button className="btn btn-primary btn-sm" onClick={() => void query.refetch()}>Reintentar</button>
        </div>
      )}
      {operationError && <p className="form-error" role="alert">{errorText(operationError)}</p>}

      {query.data && tab === "team" && (
        query.data.members.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Usuario</th><th>Rol</th><th>Miembro desde</th><th>Acciones</th></tr></thead>
              <tbody>
                {query.data.members.map((member) => (
                  <tr key={member.username}>
                    <td>
                      <div className="user-avatar-cell">
                        <span className="user-avatar-sm">{(member.display_name ?? member.email ?? member.username).charAt(0).toUpperCase()}</span>
                        <span><strong>{member.display_name || member.email || member.username}</strong>{member.display_name && <small className="td-owner">{member.email ?? member.username}</small>}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${member.role === "owner" ? "badge--ok" : member.role === "admin" ? "badge--admin" : "badge--std"}`}>{member.role === "owner" ? "Propietario" : member.role === "admin" ? "Gestor" : "Miembro"}</span></td>
                    <td className="td-date">{shortDate(member.joined_at)}</td>
                    <td className="td-actions">
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {member.role !== "owner" && (
                          <select className="admin-select" value={member.role} disabled={busy} aria-label={`Rol de ${member.username}`} onChange={(event) => roleMutation.mutate({ username: member.username, role: event.target.value as WorkspaceRole })}>
                            <option value="member">Miembro</option><option value="admin">Gestor</option>
                          </select>
                        )}
                        {member.role !== "owner" && <button className="btn btn-ghost btn-sm action-item--danger" disabled={busy} onClick={() => { if (confirm(`¿Eliminar a ${member.username} del grupo?`)) removeMutation.mutate(member.username); }}>Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="admin-empty">No hay miembros.</div>
      )}

      {query.data && tab === "invitations" && (
        <>
          <form className="admin-toolbar" onSubmit={(event) => { event.preventDefault(); const username = invite.trim().toLowerCase(); if (username) inviteMutation.mutate(username); }}>
            <input className="admin-search" type="text" autoComplete="off" value={invite} onChange={(event) => setInvite(event.target.value)} placeholder="nombre de usuario" aria-label="Usuario a invitar" />
            <button className="btn btn-primary btn-sm" disabled={busy || !invite.trim()}>Enviar invitación</button>
          </form>
          {query.data.invitations.length ? (
            <table className="admin-table">
              <thead><tr><th>Usuario</th><th>Invitado por</th><th>Fecha</th><th /></tr></thead>
              <tbody>{query.data.invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td>{invitation.username}</td><td className="td-owner">{invitation.invited_by ?? "—"}</td><td className="td-date">{shortDate(invitation.created_at)}</td>
                  <td className="td-actions"><button className="btn btn-ghost btn-sm action-item--danger" disabled={busy} onClick={() => { if (confirm("¿Cancelar esta invitación?")) cancelMutation.mutate(invitation.id); }}>Cancelar</button></td>
                </tr>
              ))}</tbody>
            </table>
          ) : <div className="admin-empty">No hay invitaciones pendientes.</div>}
        </>
      )}
    </main>
  );
}

