import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { AccountSection, PreferencesSection, ProvidersSection, SocialSection, StyleSection } from "./basic-sections";
import { BillingSection, PrivacySection } from "./privacy-billing-sections";
import type { BillingState, DeletionStatus, ProfileConnection, ProfileData, ProfileInvitation, ProfilePlatform, ProfileSession, ProfileSettings, ProfileWorkspace, SocialProfile } from "./types";
import { TokensSection } from "./tokens-section";
import { WorkspacesSection } from "./workspaces-section";
import "@/styles/routes/profile/profile.css";
import "@/styles/routes/admin/admin.css";
import "@/styles/routes/manager/manager.css";

type SectionId = "account" | "social" | "providers" | "preferences" | "style" | "workspaces" | "tokens" | "privacy" | "billing";
const sectionIds: SectionId[] = ["account", "social", "providers", "preferences", "style", "workspaces", "tokens", "privacy", "billing"];

async function loadProfile(signal: AbortSignal): Promise<ProfileData> {
  const session = await api.get<ProfileSession>("/api/auth/me", signal);
  const safe = async <T,>(url: string, fallback: T): Promise<T> => api.get<T>(url, signal).catch(() => fallback);
  const [social, settings, platform, workspaces, invitations, connections, deletion] = await Promise.all([
    safe<SocialProfile>(`/api/users/${encodeURIComponent(session.username)}`, { username: session.username }),
    safe<ProfileSettings>("/api/settings", {}),
    safe<ProfilePlatform>("/api/settings/platform/public", {}),
    safe<ProfileWorkspace[]>("/api/workspaces", []),
    safe<ProfileInvitation[]>("/api/workspaces/my-invitations", []),
    safe<ProfileConnection[]>("/api/connections/raw", []),
    safe<DeletionStatus>("/api/auth/me/deletion-status", { scheduled: false }),
  ]);
  const billing = platform.billing_enabled ? await safe<BillingState | null>("/api/billing/subscription", null) : null;
  return { session, social, settings, platform, workspaces, invitations, connections, deletion, billing };
}

function NavIcon({ section }: { section: SectionId }) {
  if (section === "account" || section === "social") return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2.5 13.5c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
  if (section === "providers") return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M6 7.5l4-2.5M6 8.5l4 2.5" stroke="currentColor" strokeWidth="1.3"/></svg>;
  if (section === "workspaces") return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M2 7h12M5 2v2M11 2v2" stroke="currentColor" strokeWidth="1.3"/></svg>;
  if (section === "tokens") return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="5.5" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M8.5 8H14M12 8v2.5M10.5 8v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
  if (section === "privacy") return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2L3 4.5V8c0 2.8 2.1 5.4 5 6 2.9-.6 5-3.2 5-6V4.5L8 2z" stroke="currentColor" strokeWidth="1.4"/></svg>;
  if (section === "billing") return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4"/></svg>;
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 2.5v11M2.5 8h11" stroke="currentColor" strokeWidth="1.3"/></svg>;
}

export function ProfilePage() {
  const [params, setParams] = useSearchParams();
  const query = useQuery({ queryKey: ["profile", "complete"], queryFn: ({ signal }) => loadProfile(signal) });
  const rawTab = params.get("tab")?.replace(/^section-/, "") ?? "account";
  const active: SectionId = sectionIds.includes(rawTab as SectionId) ? rawTab as SectionId : rawTab === "teams" ? "workspaces" : "account";
  const nav = useMemo(() => [
    ["account", "Mi cuenta"], ["social", "Perfil público"], ["providers", "Proveedores"], ["preferences", "Preferencias"], ["style", "Estilo"], ["workspaces", "Grupos"], ["tokens", "Tokens"], ["privacy", "Privacidad"],
    ...(query.data?.platform.billing_enabled ? [["billing", "Suscripción"]] : []),
  ] as Array<[SectionId, string]>, [query.data?.platform.billing_enabled]);

  if (query.isPending) return <main className="page-content"><div className="admin-empty">Cargando perfil…</div></main>;
  if (query.isError || !query.data) return <main className="page-content"><div className="admin-empty"><p>No se pudo cargar el perfil.</p><button className="btn btn-primary" onClick={() => void query.refetch()}>Reintentar</button></div></main>;
  const { session, social } = query.data;
  const avatarUrl = social.avatar_url ?? null;
  const roleLabel = session.role === "admin" ? "Administrador" : session.role === "gestor" ? "Gestor" : session.role === "guest" ? "Invitado" : "Estándar";
  return <main className="page-content">
    <div className="page-header"><div><h1 className="page-title">Perfil</h1><p className="page-subtitle">Configuración de tu cuenta</p></div></div>
    <div className="profile-panel">
      <nav className="profile-nav" aria-label="Secciones del perfil">
        <div className="profile-nav-user"><button className="profile-avatar" title="Cambia la foto en Mi cuenta" onClick={() => setParams({ tab: "account" })}>{avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{session.username.charAt(0).toUpperCase()}</span>}</button><div className="profile-nav-user-info"><div className="profile-username">{session.username}</div><div className="profile-nav-badges"><span className="profile-role-badge">{roleLabel}</span>{session.auth_method && session.auth_method !== "internal" && <span className="profile-auth-badge">{session.auth_method}</span>}</div></div></div>
        <div className="profile-nav-items">{nav.map(([id, label]) => <button key={id} className={`profile-nav-item${active === id ? " active" : ""}`} aria-current={active === id ? "page" : undefined} onClick={() => setParams({ tab: id })}><NavIcon section={id} /><span>{label}</span></button>)}</div>
      </nav>
      <div className="profile-sections"><section className="profile-section">
        {active === "account" && <AccountSection session={session} onAvatarSaved={() => void query.refetch()} />}
        {active === "social" && <SocialSection session={session} initial={social} onSaved={() => void query.refetch()} />}
        {active === "providers" && <ProvidersSection connections={query.data.connections} />}
        {active === "preferences" && <PreferencesSection settings={query.data.settings} />}
        {active === "style" && <StyleSection />}
        {active === "workspaces" && <WorkspacesSection session={session} workspaces={query.data.workspaces} invitations={query.data.invitations} onReload={() => void query.refetch()} />}
        {active === "tokens" && <TokensSection />}
        {active === "privacy" && <PrivacySection deletion={query.data.deletion} onReload={() => void query.refetch()} />}
        {active === "billing" && <BillingSection initial={query.data.billing} onReload={() => void query.refetch()} />}
      </section></div>
    </div>
  </main>;
}

