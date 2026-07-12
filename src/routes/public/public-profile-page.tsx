import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api/client";
import "@/styles/routes/u/profile-public.css";

interface Profile {
  username: string;
  avatar_url?: string;
  bio?: string;
  joined_at?: string;
  email_public?: string;
  github?: string;
  languages?: string[];
  cv?: string;
}
interface Follow {
  following: boolean;
  followers_count: number;
  following_count: number;
}
interface Resource {
  resource_type: "agent" | "skill" | "knowledge";
  resource_id: string;
  name: string;
  description?: string;
  category?: string;
  labels?: string[];
  stars_count?: number;
}
const colors = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#7c3aed", "#db2777", "#0f766e"];
function color(name: string) {
  return colors[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % colors.length];
}
export function PublicProfilePage() {
  const { username: raw = "" } = useParams(),
    username = decodeURIComponent(raw),
    [tab, setTab] = useState<Resource["resource_type"]>("agent"),
    [forked, setForked] = useState<string[]>([]);
  const profile = useQuery({
    queryKey: ["user", username],
    queryFn: ({ signal }) => api.get<Profile>(`/api/users/${encodeURIComponent(username)}`, signal),
  });
  const follow = useQuery({
    queryKey: ["user", username, "follow"],
    queryFn: ({ signal }) =>
      api.get<Follow>(`/api/users/${encodeURIComponent(username)}/follow-status`, signal, false),
  });
  const resources = useQuery({
    queryKey: ["user", username, "resources"],
    queryFn: ({ signal }) =>
      api.get<Resource[]>(`/api/users/${encodeURIComponent(username)}/resources`, signal, false),
  });
  const toggle = useMutation({
    mutationFn: () =>
      follow.data?.following
        ? api.delete(`/api/users/${encodeURIComponent(username)}/follow`)
        : api.post(`/api/users/${encodeURIComponent(username)}/follow`, {}),
    onSuccess: () => void follow.refetch(),
  });
  const fork = useMutation({
    mutationFn: (resource: Resource) =>
      api.post(
        `/api/${resource.resource_type === "skill" ? "skills" : "agents"}/private/${encodeURIComponent(resource.resource_id)}/fork`,
        {},
      ),
    onSuccess: (_, resource) =>
      setForked((values) => [...values, `${resource.resource_type}:${resource.resource_id}`]),
  });
  const visible = useMemo(
    () => (resources.data ?? []).filter((resource) => resource.resource_type === tab),
    [resources.data, tab],
  );
  if (profile.isPending)
    return (
      <main className="page-content prof-page">
        <div className="pub-loading">
          <div className="spinner" />
        </div>
      </main>
    );
  if (profile.isError || !profile.data)
    return (
      <main className="page-content prof-page">
        <div className="pub-error">
          <p>Usuario no encontrado.</p>
          <Link to="/" className="btn btn-ghost btn-sm">
            ← Volver
          </Link>
        </div>
      </main>
    );
  const data = profile.data,
    joined = data.joined_at
      ? new Date(data.joined_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";
  return (
    <main className="page-content prof-page">
      <div className="prof-wrap">
        <div className="prof-hero-card">
          <div
            className="prof-cover"
            style={{
              background: `linear-gradient(135deg,${color(username)},${color([...username].reverse().join(""))})`,
            }}
          />
          <div className="prof-hero-body">
            <div className="prof-avatar-outer">
              <div className="prof-avatar" style={{ background: color(username) }}>
                {data.avatar_url ? (
                  <img src={data.avatar_url} alt={username} />
                ) : (
                  username.charAt(0).toUpperCase()
                )}
              </div>
            </div>
            <div className="prof-hero-info">
              <h1 className="prof-name">@{username}</h1>
              {data.bio && <p className="prof-tagline">{data.bio.split("\n")[0]}</p>}
              {joined && (
                <div className="prof-hero-chips">
                  <span className="prof-chip">Miembro desde {joined}</span>
                </div>
              )}
            </div>
            <div className="prof-hero-right">
              <button
                className={`btn ${follow.data?.following ? "btn-ghost" : "btn-primary"} prof-follow-btn`}
                onClick={() => toggle.mutate()}
                disabled={toggle.isPending}
              >
                {follow.data?.following ? "Dejar de seguir" : "Seguir"}
              </button>
            </div>
          </div>
          <div className="prof-stats-bar">
            <div className="prof-stat">
              <strong>{follow.data?.followers_count ?? 0}</strong>
              <span>seguidores</span>
            </div>
            <div className="prof-stat-sep" />
            <div className="prof-stat">
              <strong>{follow.data?.following_count ?? 0}</strong>
              <span>siguiendo</span>
            </div>
            <div className="prof-stat-sep" />
            <div className="prof-stat">
              <strong>{resources.data?.length ?? 0}</strong>
              <span>recursos</span>
            </div>
          </div>
        </div>
        <div className="prof-body">
          <aside className="prof-sidebar">
            {(data.email_public || data.github) && (
              <div className="prof-card">
                <h3 className="prof-card-title">Contacto</h3>
                <div className="prof-contact-list">
                  {data.email_public && (
                    <a href={`mailto:${data.email_public}`} className="prof-contact-link">
                      ✉ {data.email_public}
                    </a>
                  )}
                  {data.github && (
                    <a
                      href={`https://github.com/${encodeURIComponent(data.github)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="prof-contact-link"
                    >
                      GitHub · {data.github}
                    </a>
                  )}
                </div>
              </div>
            )}
            {data.languages?.length && (
              <div className="prof-card">
                <h3 className="prof-card-title">Idiomas</h3>
                <div className="prof-langs-list">
                  {data.languages.map((language) => (
                    <div className="prof-lang-item" key={language}>
                      {language.toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {joined && (
              <div className="prof-card prof-card--slim">
                <h3 className="prof-card-title">Miembro desde</h3>
                <span className="prof-joined-date">{joined}</span>
              </div>
            )}
          </aside>
          <div className="prof-main">
            {data.bio && (
              <div className="prof-card">
                <h3 className="prof-card-title">Sobre mí</h3>
                <p className="prof-bio-text">{data.bio}</p>
              </div>
            )}
            {data.cv && (
              <div className="prof-card">
                <h3 className="prof-card-title">Experiencia y trayectoria</h3>
                <div className="prof-cv-body" style={{ whiteSpace: "pre-wrap" }}>
                  {data.cv}
                </div>
              </div>
            )}
            <div className="prof-card">
              <h3 className="prof-card-title">Recursos públicos</h3>
              <div className="pub-tabs">
                {(["agent", "skill", "knowledge"] as const).map((type) => (
                  <button
                    className={`pub-tab${tab === type ? " active" : ""}`}
                    onClick={() => setTab(type)}
                    key={type}
                  >
                    {type === "agent" ? "Agentes" : type === "skill" ? "Skills" : "Knowledge"}
                  </button>
                ))}
              </div>
              <div className="pub-resources-list">
                {visible.length ? (
                  visible.map((resource) => {
                    const key = `${resource.resource_type}:${resource.resource_id}`,
                      copied = forked.includes(key);
                    return (
                      <div className="pub-resource-card" key={key}>
                        <div
                          className="pub-resource-avatar"
                          style={{ background: color(resource.name) }}
                        >
                          {resource.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="pub-resource-info">
                          <span className="pub-resource-name">{resource.name}</span>
                          {resource.description && (
                            <p className="pub-resource-desc">{resource.description}</p>
                          )}
                          <div className="pub-resource-badges">
                            {resource.category && (
                              <span className="pub-resource-cat">{resource.category}</span>
                            )}
                          </div>
                        </div>
                        <div className="pub-resource-actions">
                          <span className="pub-resource-stars">★ {resource.stars_count ?? 0}</span>
                          {resource.resource_type !== "knowledge" && (
                            <button
                              className={`pub-resource-fork${copied ? " forked" : ""}`}
                              disabled={copied || fork.isPending}
                              onClick={() => fork.mutate(resource)}
                            >
                              ⑂ {copied ? "Copiado" : "Copiar"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="pub-empty">Este usuario no tiene recursos públicos todavía.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

