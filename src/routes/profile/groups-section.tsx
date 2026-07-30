import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import { BlockActionIcon, DeleteActionIcon, UnblockActionIcon } from "@/components/resource-icons";
import type { ProfileInvitation, ProfileSession, ProfileGroup } from "./types";

interface Member {
  username: string;
  display_name?: string | null;
  email?: string | null;
  role: "owner" | "admin" | "member";
  joined_at?: string | null;
}
interface Pending {
  id: string;
  username: string;
  invited_by?: string;
  created_at?: string;
}

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : i18n.t("common.errors.operation");
}
function date(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? "—"
    : parsed.toLocaleDateString(i18n.resolvedLanguage === "en" ? "en-GB" : "es-ES");
}

export function GroupsSection({
  session,
  groups,
  invitations,
  onReload,
}: {
  session: ProfileSession;
  groups: ProfileGroup[];
  invitations: ProfileInvitation[];
  onReload: () => void;
}) {
  const { t } = useTranslation();
  const [view, setView] = useState<"mine" | "invitations">("mine");
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState<ProfileGroup | null>(null);
  const create = useMutation({
    mutationFn: (name: string) => api.post("/api/groups", { name }),
    onSuccess: () => {
      setNewName("");
      onReload();
    },
  });
  const invitationAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "reject" }) =>
      api.post(`/api/groups/invitations/${encodeURIComponent(id)}/${action}`, {}),
    onSuccess: onReload,
  });
  return (
    <>
      <div className="section-title-row">
        <div className="section-title">{t("landing.features.groups_title")}</div>
      </div>

      <form
        className="admin-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          if (newName.trim()) create.mutate(newName.trim());
        }}
      >
        <input
          className="admin-search"
          value={newName}
          maxLength={80}
          onChange={(event) => setNewName(event.target.value)}
          placeholder={t("legacy.text_e6deb3a79dc8")}
        />

        <button className="btn btn-primary btn-sm" disabled={!newName.trim() || create.isPending}>
          {t("legacy.text_dc81c178421c")}
        </button>
      </form>

      <div className="teams-tabs">
        <button
          className={`teams-tab${view === "mine" ? " active" : ""}`}
          onClick={() => setView("mine")}
        >
          {t("legacy.text_59fdd7fcbbac")}
        </button>
        <button
          className={`teams-tab${view === "invitations" ? " active" : ""}`}
          onClick={() => setView("invitations")}
        >
          {t("manager.manager.tabs.invitations")}
          {invitations.length > 0 && (
            <span className="badge badge--warn">{invitations.length}</span>
          )}
        </button>
      </div>

      {(create.error || invitationAction.error) && (
        <p className="form-error">{errorText(create.error ?? invitationAction.error)}</p>
      )}

      {view === "mine" && (
        <div>
          {groups.filter((group) => group.type === "team").length ? (
            groups
              .filter((group) => group.type === "team")
              .map((group) => (
                <div className="profile-group-card" key={group.id}>
                  <div className="profile-group-info">
                    <span className="profile-group-name">{group.name}</span>
                    <span className="profile-group-role">
                      {{ owner: "Propietario", admin: "Gestor", member: "Miembro" }[group.role]}
                      {group.status === "disabled" ? " · Desactivado" : ""}
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelected(group)}>
                    {group.role === "member" ? "Ver" : "Gestionar"}
                  </button>
                </div>
              ))
          ) : (
            <p className="profile-empty-msg">{t("workflows.share.no_groups")}</p>
          )}
        </div>
      )}

      {view === "invitations" && (
        <div>
          {invitations.length ? (
            invitations.map((invitation) => (
              <div className="group-inv-received-card" key={invitation.id}>
                <div className="group-inv-info">
                  <span className="group-inv-group-name">
                    {invitation.group_name || invitation.group_id}
                  </span>
                  <span className="group-inv-from">
                    {t("teams.invitations.col_invited_by")}
                    <strong>{invitation.invited_by}</strong>
                  </span>
                </div>
                <div className="group-inv-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={invitationAction.isPending}
                    onClick={() => invitationAction.mutate({ id: invitation.id, action: "accept" })}
                  >
                    {t("teams.invitations.accept")}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={invitationAction.isPending}
                    onClick={() => invitationAction.mutate({ id: invitation.id, action: "reject" })}
                  >
                    {t("teams.invitations.reject")}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="profile-empty-msg">{t("legacy.text_d466ee1e04e9")}</p>
          )}
        </div>
      )}

      {selected && (
        <GroupDialog
          session={session}
          group={selected}
          onClose={() => setSelected(null)}
          onReload={() => {
            onReload();
          }}
          onDeleted={() => {
            setSelected(null);
            onReload();
          }}
        />
      )}
    </>
  );
}

function GroupDialog({
  session,
  group,
  onClose,
  onReload,
  onDeleted,
}: {
  session: ProfileSession;
  group: ProfileGroup;
  onClose: () => void;
  onReload: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const canManage = group.role === "owner" || group.role === "admin";
  const [invite, setInvite] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const details = useQuery({
    queryKey: ["profile", "group", group.id],
    queryFn: async ({ signal }) => {
      const members = await api.get<Member[]>(
        `/api/groups/${encodeURIComponent(group.id)}/members`,
        signal,
      );
      const pending = canManage
        ? await api.get<Pending[]>(
            `/api/groups/${encodeURIComponent(group.id)}/invitations`,
            signal,
          )
        : [];
      return { members, pending };
    },
  });
  const operation = useMutation({
    mutationFn: async (
      task:
        | { kind: "invite"; username: string }
        | { kind: "remove"; username: string }
        | { kind: "cancel"; id: string }
        | { kind: "role"; username: string; role: "admin" | "member" }
        | { kind: "status"; status: "active" | "disabled" }
        | { kind: "delete" }
        | { kind: "leave" }
        | { kind: "transfer"; username: string },
    ) => {
      const base = `/api/groups/${encodeURIComponent(group.id)}`;
      switch (task.kind) {
        case "invite":
          return api.post(`${base}/invitations`, { username: task.username });
        case "remove":
          return api.delete(`${base}/members/${encodeURIComponent(task.username)}`);
        case "cancel":
          return api.delete(`${base}/invitations/${encodeURIComponent(task.id)}`);
        case "role":
          return api.patch(`${base}/members/${encodeURIComponent(task.username)}`, {
            role: task.role,
          });
        case "status":
          return api.post(`${base}/status`, { status: task.status });
        case "delete":
          return api.delete(base);
        case "leave":
          return api.delete(`${base}/members/${encodeURIComponent(session.username)}`);
        case "transfer":
          return api.post(`${base}/transfer-ownership`, { username: task.username });
      }
    },
    onSuccess: async (_data, task) => {
      if (task.kind === "delete" || task.kind === "leave") {
        onDeleted();
        return;
      }
      setInvite("");
      setTransferTo("");
      await details.refetch();
      onReload();
    },
  });
  const submitInvite = (event: FormEvent) => {
    event.preventDefault();
    const username = invite.trim().toLowerCase();
    if (username) operation.mutate({ kind: "invite", username });
  };
  return (
    <div
      className="modal-bg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-group-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-box" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3 className="modal-title" id="profile-group-title">
            {group.name}
          </h3>
          <button className="modal-close" onClick={onClose} aria-label={t("agents.chat.close")}>
            ×
          </button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {details.isPending && <div className="admin-empty">{t("legacy.text_20de8f2b0cb9")}</div>}
          {details.error && <p className="form-error">{errorText(details.error)}</p>}

          {details.data && (
            <>
              <div>
                <div className="section-subtitle">{t("legacy.text_5f7424ca2aad")}</div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("admin.table.user")}</th>
                      <th>{t("admin.table.role")}</th>
                      <th>{t("legacy.text_966c7c4cad9a")}</th>
                      {canManage && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {details.data.members.map((member) => (
                      <tr key={member.username}>
                        <td>{member.display_name || member.email || member.username}</td>
                        <td>
                          {canManage && member.role !== "owner" ? (
                            <select
                              className="admin-select"
                              value={member.role}
                              disabled={operation.isPending}
                              onChange={(event) =>
                                operation.mutate({
                                  kind: "role",
                                  username: member.username,
                                  role: event.target.value as "admin" | "member",
                                })
                              }
                            >
                              <option value="member">{t("errors.resources.member")}</option>
                              <option value="admin">{t("teams.manager_badge")}</option>
                            </select>
                          ) : (
                            <span className="badge badge--std">{member.role}</span>
                          )}
                        </td>
                        <td className="td-date">{date(member.joined_at)}</td>
                        {canManage && (
                          <td className="td-actions">
                            {member.role !== "owner" && (
                              <button
                                className="btn-icon btn-icon--danger"
                                title={t("profile.groups_page.remove_btn")}
                                aria-label={t("profile.groups_page.remove_btn")}
                                disabled={operation.isPending}
                                onClick={() => {
                                  if (
                                    confirm(
                                      i18n.t("dynamic.group_remove_member_confirm", {
                                        username: member.username,
                                      }),
                                    )
                                  )
                                    operation.mutate({ kind: "remove", username: member.username });
                                }}
                              >
                                <DeleteActionIcon />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {canManage && (
                <>
                  <form onSubmit={submitInvite}>
                    <div className="section-subtitle">{t("legacy.text_9bcdd690ff12")}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="input"
                        value={invite}
                        onChange={(event) => setInvite(event.target.value)}
                        placeholder={t("legacy.text_0acee635afbe")}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={!invite.trim() || operation.isPending}
                      >
                        {t("explore.users.invite")}
                      </button>
                    </div>
                  </form>
                  <div>
                    <div className="section-subtitle">{t("legacy.text_51875371a9f6")}</div>
                    {details.data.pending.length ? (
                      details.data.pending.map((pending) => (
                        <div className="group-inv-row" key={pending.id}>
                          <span className="group-inv-username">{pending.username}</span>
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={operation.isPending}
                            onClick={() => operation.mutate({ kind: "cancel", id: pending.id })}
                          >
                            {t("agents.scan.folder_cancel_btn")}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="profile-empty-msg">{t("legacy.text_90d3baa68900")}</p>
                    )}
                  </div>
                </>
              )}

              {group.role === "owner" ? (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                  <div className="section-subtitle" style={{ color: "var(--danger,#e55)" }}>
                    {t("legacy.text_fef7749db2c4")}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn-icon"
                      title={
                        group.status === "disabled"
                          ? t("profile.groups_page.reactivate_group_btn")
                          : t("profile.groups_page.deactivate_group_btn")
                      }
                      aria-label={
                        group.status === "disabled"
                          ? t("profile.groups_page.reactivate_group_btn")
                          : t("profile.groups_page.deactivate_group_btn")
                      }
                      disabled={operation.isPending}
                      onClick={() =>
                        operation.mutate({
                          kind: "status",
                          status: group.status === "disabled" ? "active" : "disabled",
                        })
                      }
                    >
                      {group.status === "disabled" ? (
                        <UnblockActionIcon />
                      ) : (
                        <BlockActionIcon />
                      )}
                    </button>
                    <button
                      className="btn-icon btn-icon--danger"
                      title={t("profile.groups_page.delete_group_btn")}
                      aria-label={t("profile.groups_page.delete_group_btn")}
                      disabled={operation.isPending}
                      onClick={() => {
                        if (
                          confirm(
                            i18n.t("dynamic.group_delete_confirm", {
                              name: group.name,
                            }),
                          )
                        )
                          operation.mutate({ kind: "delete" });
                      }}
                    >
                      <DeleteActionIcon />
                    </button>
                  </div>
                  <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                    <select
                      className="select"
                      value={transferTo}
                      onChange={(event) => setTransferTo(event.target.value)}
                    >
                      <option value="">{t("legacy.text_f71eab0c1f2f")}</option>
                      {details.data.members
                        .filter((member) => member.username !== session.username)
                        .map((member) => (
                          <option key={member.username} value={member.username}>
                            {member.display_name || member.username}
                          </option>
                        ))}
                    </select>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={!transferTo || operation.isPending}
                      onClick={() => operation.mutate({ kind: "transfer", username: transferTo })}
                    >
                      {t("profile.privacy.btn_transfer")}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                  <button
                    className="btn btn-ghost action-item--danger"
                    disabled={operation.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          i18n.t("dynamic.group_leave_confirm", {
                            name: group.name,
                          }),
                        )
                      )
                        operation.mutate({ kind: "leave" });
                    }}
                  >
                    {t("legacy.text_14b1e623004c")}
                  </button>
                </div>
              )}
            </>
          )}

          {operation.error && <p className="form-error">{errorText(operation.error)}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            {t("agents.chat.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
