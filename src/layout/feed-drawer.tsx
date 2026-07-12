import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { queryClient } from "@/api/query-client";
import "../../assets/components/feed_widget/feed_widget.css";

interface FeedItem {
  resource_type: string;
  resource_id: string;
  name: string;
  category?: string;
  description?: string;
  owner: string;
  updated_at?: string;
  stars_count?: number;
}

const feedKey = ["feed", 30] as const;
const colors = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#7c3aed", "#db2777", "#0f766e"];
const labels: Record<string, string> = { agent: "Agente", skill: "Skill", knowledge: "Knowledge" };

export function FeedDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [starred, setStarred] = useState<Set<string>>(() => new Set());
  const feed = useQuery({ queryKey: feedKey, queryFn: ({ signal }) => api.get<FeedItem[]>("/api/feed?limit=30", signal), enabled: open, staleTime: 60_000 });
  const toggleStar = useMutation({
    mutationFn: ({ item, active }: { item: FeedItem; active: boolean }) => active
      ? api.delete<{ stars: number }>(`/api/${encodeURIComponent(item.resource_type)}/${encodeURIComponent(item.resource_id)}/star`)
      : api.post<{ stars: number }>(`/api/${encodeURIComponent(item.resource_type)}/${encodeURIComponent(item.resource_id)}/star`, {}),
    onSuccess: (data, { item, active }) => {
      const key = `${item.resource_type}:${item.resource_id}`;
      setStarred((current) => { const next = new Set(current); if (active) next.delete(key); else next.add(key); return next; });
      queryClient.setQueryData<FeedItem[]>(feedKey, (items) => items?.map((entry) => entry === item ? { ...entry, stars_count: data.stars } : entry));
    },
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", escape); };
  }, [onClose, open]);

  return <>
    <div className={`feed-drawer-backdrop${open ? " visible" : ""}`} onClick={onClose} />
    <aside className={`feed-drawer${open ? " open" : ""}`} aria-hidden={!open} aria-label="Feed">
      <div className="feed-drawer-header"><span className="feed-drawer-title">Feed</span><button className="feed-drawer-close" onClick={onClose} aria-label="Cerrar"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></button></div>
      <div className="feed-drawer-body">
        {feed.isPending && open && <div className="feed-drawer-spinner"><div className="spinner" /></div>}
        {feed.isError && <div className="feed-drawer-empty"><p>Error al cargar el feed.</p><button className="btn btn-ghost btn-sm" onClick={() => void feed.refetch()}>Reintentar</button></div>}
        {feed.data?.length === 0 && <div className="feed-drawer-empty"><p>Sigue usuarios desde <Link to="/explore/" onClick={onClose}>Explorar</Link> para ver su actividad aquí.</p></div>}
        {feed.data?.map((item) => { const key = `${item.resource_type}:${item.resource_id}`; const active = starred.has(key); return <article className="feed-mini-card" key={key}><div className="feed-mini-top"><div className="feed-mini-avatar" style={{ background: colorFor(item.name) }}>{item.name.charAt(0).toUpperCase()}</div><div className="feed-mini-info"><div className="feed-mini-name">{item.name}</div><div className="feed-mini-meta"><span className="feed-mini-type-badge">{labels[item.resource_type] ?? item.resource_type}</span>{item.category ?? ""}</div></div></div>{item.description && <p className="feed-mini-desc">{item.description}</p>}<div className="feed-mini-footer"><Link to={`/u/${encodeURIComponent(item.owner)}`} className="feed-mini-author" onClick={onClose}>@{item.owner}</Link><span className="feed-mini-date">{relativeDate(item.updated_at)}</span><button className={`feed-mini-star${active ? " starred" : ""}`} disabled={toggleStar.isPending} onClick={() => toggleStar.mutate({ item, active })}>★ {item.stars_count ?? 0}</button></div></article>; })}
      </div>
    </aside>
  </>;
}

function colorFor(name: string): string { let value = 0; for (const character of name) value += character.charCodeAt(0); return colors[value % colors.length] ?? colors[0]!; }
function relativeDate(value?: string): string { if (!value) return ""; const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000)); if (minutes < 60) return `hace ${minutes}min`; const hours = Math.floor(minutes / 60); if (hours < 24) return `hace ${hours}h`; const days = Math.floor(hours / 24); return days < 30 ? `hace ${days}d` : new Date(value).toLocaleDateString(); }
