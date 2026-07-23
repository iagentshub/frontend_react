import { useCallback, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import { queryClient, queryKeys } from "@/api/query-client";
import { sessionQuery } from "@/auth/queries";
import { FeedDrawer } from "./feed-drawer";
import { NavIcon } from "./nav-icon";

interface NavWorkspace {
  id: string;
  name: string;
  active?: boolean;
}

const primaryLinks = [
  ["/dashboard/", "dashboard", "nav.dashboard"],
  ["/explore/", "explore", "nav.explore"],
  ["/agents/", "agents", "nav.agents"],
  ["/knowledge/", "knowledge", "nav.knowledge"],
  ["/connections/", "connections", "nav.connections"],
] as const;

export function MainNav() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useQuery(sessionQuery);
  const [open, setOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const closeFeed = useCallback(() => setFeedOpen(false), []);
  const workspaces = useQuery({
    queryKey: ["workspaces", "nav"],
    queryFn: ({ signal }) => api.get<NavWorkspace[]>("/api/workspaces", signal),
    enabled: Boolean(user && user.role !== "guest"),
  });
  const switchWorkspace = useMutation({
    mutationFn: (id: string) =>
      api.post(`/api/workspaces/switch/${encodeURIComponent(id)}`, {}),
    onSuccess: async () => {
      setWorkspaceOpen(false);
      await queryClient.cancelQueries();
      queryClient.clear();
      window.location.reload();
    },
  });
  const createWorkspace = useMutation({
    mutationFn: (name: string) => api.post<NavWorkspace>("/api/workspaces", { name }),
    onSuccess: (workspace) => switchWorkspace.mutate(workspace.id),
  });
  const logout = useMutation({
    mutationFn: () => api.post<{ ok: boolean }>("/api/auth/logout", {}),
    onSuccess: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      void navigate("/login/", { replace: true });
    },
  });

  const switchLanguage = () => {
    const next = i18n.language === "es" ? "en" : "es";
    void i18n.changeLanguage(next);
    if (user?.role !== "guest") {
      void api.put("/api/settings", { language: next }).then(() =>
        queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
      );
    }
  };

  return (
    <>
      <button className="nav-hamburger" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
      </button>
      <div className={`nav-backdrop${open ? " visible" : ""}`} onClick={() => setOpen(false)} />
      <nav className={`main-nav${open ? " nav-open" : ""}`} aria-label="Navegación principal">
        <div className="nav-brand-row">
          <NavLink className="nav-brand" to="/dashboard/" onClick={() => setOpen(false)}>
            <div className="nav-logo-mark"><span className="nav-logo-iagents">iAgents</span><span className="nav-logo-hub">Hub</span></div>
          </NavLink>
          <button className="nav-close-btn" aria-label="Cerrar menú" onClick={() => setOpen(false)}>×</button>
        </div>
        {user?.role !== "guest" && (
          <div className="nav-workspace-bar">
            <button
              className="nav-ws-btn"
              aria-label="Cambiar workspace"
              aria-expanded={workspaceOpen}
              onClick={() => setWorkspaceOpen((value) => !value)}
            >
              <NavIcon kind="workspace" />
              <span className="nav-ws-name">
                {user?.workspace_name
                  ?? workspaces.data?.find((workspace) => workspace.active)?.name
                  ?? "Personal"}
              </span>
              <span className="nav-ws-chevron">⌄</span>
            </button>
            {workspaceOpen && (
              <div className="nav-ws-dropdown">
                <div className="nav-ws-list">
                  {(workspaces.data ?? []).map((workspace) => (
                    <button
                      className={`nav-ws-item${workspace.active ? " nav-ws-item--active" : ""}`}
                      disabled={switchWorkspace.isPending}
                      onClick={() => switchWorkspace.mutate(workspace.id)}
                      key={workspace.id}
                    >
                      <span className="nav-ws-item-name">{workspace.name}</span>
                      {workspace.active && <span aria-hidden="true">✓</span>}
                    </button>
                  ))}
                </div>
                <div className="nav-ws-footer">
                  <button
                    className="nav-ws-create-btn"
                    disabled={createWorkspace.isPending || switchWorkspace.isPending}
                    onClick={() => {
                      const name = window.prompt("Nombre del nuevo workspace:");
                      if (name?.trim()) createWorkspace.mutate(name.trim());
                    }}
                  >
                    + Nuevo workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="nav-section">
          {primaryLinks.map(([to, icon, key]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <span className="nav-link-icon"><NavIcon kind={icon} /></span>{t(key)}
            </NavLink>
          ))}
        </div>
        {user?.role === "admin" && (
          <div className="nav-section nav-admin-section">
            <div className="nav-section-label">{t("nav.admin")}</div>
            <NavLink end className="nav-link" to="/admin/"><span className="nav-link-icon"><NavIcon kind="admin" /></span>{t("nav.admin_users")}</NavLink>
            <NavLink className="nav-link" to="/admin/metadata/"><span className="nav-link-icon"><NavIcon kind="logs" /></span>Sistema</NavLink>
            <NavLink className="nav-link" to="/admin/centinel/"><span className="nav-link-icon"><NavIcon kind="centinel" /></span>Centinel</NavLink>
          </div>
        )}
        <div className="nav-spacer" />
        <div className="nav-footer">
          <div className="nav-footer-actions">
            <button className="nav-lang-btn" onClick={switchLanguage} aria-label="Switch language"><NavIcon kind="lang" /><span className="nav-lang-label">{i18n.language.toUpperCase()}</span></button>
            <button className={`nav-icon-btn${feedOpen ? " active" : ""}`} onClick={() => { setFeedOpen((value) => !value); setOpen(false); }} title="Feed" aria-label="Feed"><NavIcon kind="feed" /></button>
            <NavLink className="nav-icon-btn" to="/labels/" title={t("labels.catalog.nav_title")}><NavIcon kind="labels" /></NavLink>
            <NavLink className="nav-icon-btn" to="/docs/" title={t("nav.docs")}><NavIcon kind="docs" /></NavLink>
            <NavLink className="nav-icon-btn" to="/about/" title={t("nav.about")}><NavIcon kind="about" /></NavLink>
            <NavLink className="nav-icon-btn" to="/support/" title={t("nav.support")}><NavIcon kind="support" /></NavLink>
          </div>
          <div className="nav-user-row">
            <button className="nav-user" onClick={() => void navigate("/profile/")} title={t("nav.profile")}>
              <span className="nav-user-avatar">{user?.username.charAt(0).toUpperCase() || "?"}</span>
              <span>{user?.username || "…"}</span>
            </button>
            <button className="nav-logout-btn" disabled={logout.isPending} onClick={() => { if (confirm(t("nav.logout_confirm"))) logout.mutate(); }} aria-label={t("nav.logout")}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </nav>
      <FeedDrawer open={feedOpen} onClose={closeFeed} />
    </>
  );
}
