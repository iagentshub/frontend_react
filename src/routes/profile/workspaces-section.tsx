import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import type { ProfileInvitation, ProfileSession, ProfileWorkspace } from "./types";

interface Member { username: string; display_name?: string | null; email?: string | null; role: "owner" | "admin" | "member"; joined_at?: string | null }
interface Pending { id: string; username: string; invited_by?: string; created_at?: string }

function errorText(error: unknown) { return error instanceof ApiError ? error.message : "No se pudo completar la operación."; }
function date(value?: string | null) { if (!value) return "—"; const parsed = new Date(value); return Number.isNaN(parsed.valueOf()) ? "—" : parsed.toLocaleDateString("es-ES"); }

export function WorkspacesSection({ session, workspaces, invitations, onReload }: { session: ProfileSession; workspaces: ProfileWorkspace[]; invitations: ProfileInvitation[]; onReload: () => void }) {
  const [view, setView] = useState<"mine" | "invitations">("mine");
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState<ProfileWorkspace | null>(null);
  const create = useMutation({ mutationFn: (name: string) => api.post("/api/workspaces", { name }), onSuccess: () => { setNewName(""); onReload(); } });
  const invitationAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "reject" }) => api.post(`/api/workspaces/invitations/${encodeURIComponent(id)}/${action}`, {}),
    onSuccess: onReload,
  });
  return <>
    <div className="section-title-row"><div className="section-title">Grupos de trabajo</div></div>
    <form className="admin-toolbar" onSubmit={(event) => { event.preventDefault(); if (newName.trim()) create.mutate(newName.trim()); }}>
      <input className="admin-search" value={newName} maxLength={80} onChange={(event) => setNewName(event.target.value)} placeholder="Nombre del nuevo grupo" />
      <button className="btn btn-primary btn-sm" disabled={!newName.trim() || create.isPending}>+ Nuevo grupo</button>
    </form>
    <div className="teams-tabs"><button className={`teams-tab${view === "mine" ? " active" : ""}`} onClick={() => setView("mine")}>Mis grupos</button><button className={`teams-tab${view === "invitations" ? " active" : ""}`} onClick={() => setView("invitations")}>Invitaciones {invitations.length > 0 && <span className="badge badge--warn">{invitations.length}</span>}</button></div>
    {(create.error || invitationAction.error) && <p className="form-error">{errorText(create.error ?? invitationAction.error)}</p>}
    {view === "mine" && <div>{workspaces.filter((workspace) => workspace.type === "team").length ? workspaces.filter((workspace) => workspace.type === "team").map((workspace) => <div className="profile-ws-card" key={workspace.id}><div className="profile-ws-info"><span className="profile-ws-name">{workspace.name}</span><span className="profile-ws-role">{{ owner: "Propietario", admin: "Gestor", member: "Miembro" }[workspace.role]}{workspace.status === "disabled" ? " · Desactivado" : ""}</span></div><button className="btn btn-ghost btn-sm" onClick={() => setSelected(workspace)}>{workspace.role === "member" ? "Ver" : "Gestionar"}</button></div>) : <p className="profile-empty-msg">No perteneces a ningún grupo de trabajo.</p>}</div>}
    {view === "invitations" && <div>{invitations.length ? invitations.map((invitation) => <div className="ws-inv-received-card" key={invitation.id}><div className="ws-inv-info"><span className="ws-inv-ws-name">{invitation.workspace_name || invitation.workspace_id}</span><span className="ws-inv-from">Invitado por <strong>{invitation.invited_by}</strong></span></div><div className="ws-inv-actions"><button className="btn btn-primary btn-sm" disabled={invitationAction.isPending} onClick={() => invitationAction.mutate({ id: invitation.id, action: "accept" })}>Aceptar</button><button className="btn btn-ghost btn-sm" disabled={invitationAction.isPending} onClick={() => invitationAction.mutate({ id: invitation.id, action: "reject" })}>Rechazar</button></div></div>) : <p className="profile-empty-msg">No tienes invitaciones pendientes.</p>}</div>}
    {selected && <WorkspaceDialog session={session} workspace={selected} onClose={() => setSelected(null)} onReload={() => { onReload(); }} onDeleted={() => { setSelected(null); onReload(); }} />}
  </>;
}

function WorkspaceDialog({ session, workspace, onClose, onReload, onDeleted }: { session: ProfileSession; workspace: ProfileWorkspace; onClose: () => void; onReload: () => void; onDeleted: () => void }) {
  const canManage = workspace.role === "owner" || workspace.role === "admin";
  const [invite, setInvite] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const details = useQuery({
    queryKey: ["profile", "workspace", workspace.id],
    queryFn: async ({ signal }) => {
      const members = await api.get<Member[]>(`/api/workspaces/${encodeURIComponent(workspace.id)}/members`, signal);
      const pending = canManage ? await api.get<Pending[]>(`/api/workspaces/${encodeURIComponent(workspace.id)}/invitations`, signal) : [];
      return { members, pending };
    },
  });
  const operation = useMutation({
    mutationFn: async (task: { kind: "invite"; username: string } | { kind: "remove"; username: string } | { kind: "cancel"; id: string } | { kind: "role"; username: string; role: "admin" | "member" } | { kind: "status"; status: "active" | "disabled" } | { kind: "delete" } | { kind: "leave" } | { kind: "transfer"; username: string }) => {
      const base = `/api/workspaces/${encodeURIComponent(workspace.id)}`;
      switch (task.kind) {
        case "invite": return api.post(`${base}/invitations`, { username: task.username });
        case "remove": return api.delete(`${base}/members/${encodeURIComponent(task.username)}`);
        case "cancel": return api.delete(`${base}/invitations/${encodeURIComponent(task.id)}`);
        case "role": return api.patch(`${base}/members/${encodeURIComponent(task.username)}`, { role: task.role });
        case "status": return api.post(`${base}/status`, { status: task.status });
        case "delete": return api.delete(base);
        case "leave": return api.delete(`${base}/members/${encodeURIComponent(session.username)}`);
        case "transfer": return api.post(`${base}/transfer-ownership`, { username: task.username });
      }
    },
    onSuccess: async (_data, task) => {
      if (task.kind === "delete" || task.kind === "leave") { onDeleted(); return; }
      setInvite(""); setTransferTo(""); await details.refetch(); onReload();
    },
  });
  const submitInvite = (event: FormEvent) => { event.preventDefault(); const username = invite.trim().toLowerCase(); if (username) operation.mutate({ kind: "invite", username }); };
  return <div className="modal-bg" role="dialog" aria-modal="true" aria-labelledby="profile-workspace-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-box" style={{ maxWidth: 640 }}><div className="modal-header"><h3 className="modal-title" id="profile-workspace-title">{workspace.name}</h3><button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button></div><div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    {details.isPending && <div className="admin-empty">Cargando miembros…</div>}{details.error && <p className="form-error">{errorText(details.error)}</p>}
    {details.data && <><div><div className="section-subtitle">Miembros actuales</div><table className="admin-table"><thead><tr><th>Usuario</th><th>Rol</th><th>Desde</th>{canManage && <th />}</tr></thead><tbody>{details.data.members.map((member) => <tr key={member.username}><td>{member.display_name || member.email || member.username}</td><td>{canManage && member.role !== "owner" ? <select className="admin-select" value={member.role} disabled={operation.isPending} onChange={(event) => operation.mutate({ kind: "role", username: member.username, role: event.target.value as "admin" | "member" })}><option value="member">Miembro</option><option value="admin">Gestor</option></select> : <span className="badge badge--std">{member.role}</span>}</td><td className="td-date">{date(member.joined_at)}</td>{canManage && <td className="td-actions">{member.role !== "owner" && <button className="btn btn-ghost btn-sm action-item--danger" disabled={operation.isPending} onClick={() => { if (confirm(`¿Quitar a ${member.username}?`)) operation.mutate({ kind: "remove", username: member.username }); }}>Quitar</button>}</td>}</tr>)}</tbody></table></div>
      {canManage && <><form onSubmit={submitInvite}><div className="section-subtitle">Invitar por nombre de usuario</div><div style={{ display: "flex", gap: 8 }}><input className="input" value={invite} onChange={(event) => setInvite(event.target.value)} placeholder="nombre de usuario" /><button className="btn btn-primary btn-sm" disabled={!invite.trim() || operation.isPending}>Invitar</button></div></form><div><div className="section-subtitle">Invitaciones pendientes</div>{details.data.pending.length ? details.data.pending.map((pending) => <div className="ws-inv-row" key={pending.id}><span className="ws-inv-username">{pending.username}</span><button className="btn btn-ghost btn-sm" disabled={operation.isPending} onClick={() => operation.mutate({ kind: "cancel", id: pending.id })}>Cancelar</button></div>) : <p className="profile-empty-msg">Sin invitaciones pendientes.</p>}</div></>}
      {workspace.role === "owner" ? <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}><div className="section-subtitle" style={{ color: "var(--danger,#e55)" }}>Zona de peligro</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="btn btn-ghost" disabled={operation.isPending} onClick={() => operation.mutate({ kind: "status", status: workspace.status === "disabled" ? "active" : "disabled" })}>{workspace.status === "disabled" ? "Reactivar grupo" : "Desactivar grupo"}</button><button className="btn btn-danger" disabled={operation.isPending} onClick={() => { if (confirm(`¿Eliminar "${workspace.name}" y todo su contenido?`)) operation.mutate({ kind: "delete" }); }}>Eliminar grupo</button></div><div style={{ marginTop: 14, display: "flex", gap: 8 }}><select className="select" value={transferTo} onChange={(event) => setTransferTo(event.target.value)}><option value="">Transferir propiedad a…</option>{details.data.members.filter((member) => member.username !== session.username).map((member) => <option key={member.username} value={member.username}>{member.display_name || member.username}</option>)}</select><button className="btn btn-ghost btn-sm" disabled={!transferTo || operation.isPending} onClick={() => operation.mutate({ kind: "transfer", username: transferTo })}>Transferir</button></div></div> : <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}><button className="btn btn-ghost action-item--danger" disabled={operation.isPending} onClick={() => { if (confirm(`¿Abandonar "${workspace.name}"?`)) operation.mutate({ kind: "leave" }); }}>Abandonar grupo</button></div>}
    </>}
    {operation.error && <p className="form-error">{errorText(operation.error)}</p>}
  </div><div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cerrar</button></div></div></div>;
}
