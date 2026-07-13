import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";

export interface PersonalToken {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  status: "active" | "revoked" | "expired";
}

type Expiry = "30" | "90" | "180" | "never";

const EXPIRY_OPTIONS: Array<[Expiry, string]> = [
  ["30", "30 días"],
  ["90", "90 días"],
  ["180", "180 días"],
  ["never", "Sin caducidad"],
];

const STATUS_LABEL: Record<PersonalToken["status"], string> = {
  active: "Activo",
  revoked: "Revocado",
  expired: "Caducado",
};

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : "No se pudo completar la operación.";
}

function date(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? "—" : parsed.toLocaleDateString("es-ES");
}

export function TokensSection() {
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState<Expiry>("90");
  // El token en claro solo existe en esta variable, y solo hasta que se recargue
  // la página: el backend no lo devuelve nunca más.
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const list = useQuery({
    queryKey: ["profile", "tokens"],
    queryFn: ({ signal }) => api.get<PersonalToken[]>("/api/auth/tokens", signal),
  });

  const create = useMutation({
    mutationFn: (body: { name: string; expires_in_days: number | null }) =>
      api.post<PersonalToken & { token: string }>("/api/auth/tokens", body),
    onSuccess: async (data) => {
      setJustCreated(data.token);
      setCopied(false);
      setName("");
      await list.refetch();
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/api/auth/tokens/${encodeURIComponent(id)}`),
    onSuccess: async () => {
      await list.refetch();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate({
      name: trimmed,
      expires_in_days: expiry === "never" ? null : Number(expiry),
    });
  };

  const copy = async () => {
    if (!justCreated) return;
    await navigator.clipboard.writeText(justCreated);
    setCopied(true);
  };

  return (
    <>
      <div className="section-title-row">
        <div className="section-title">Tokens personales</div>
      </div>
      <p className="profile-empty-msg" style={{ marginTop: 0 }}>
        Un token te permite conectar clientes que no son un navegador —como la extensión de
        VS Code— con tu cuenta. Concede <strong>acceso completo a la API con tus mismos
        permisos</strong>: trátalo como una contraseña y revócalo si lo expones.
      </p>

      <form className="admin-toolbar" onSubmit={submit}>
        <input
          className="admin-search"
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          placeholder="Para qué es (p. ej. VS Code del portátil)"
        />
        <select
          className="admin-select"
          value={expiry}
          onChange={(event) => setExpiry(event.target.value as Expiry)}
        >
          {EXPIRY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" disabled={!name.trim() || create.isPending}>
          + Crear token
        </button>
      </form>

      {justCreated && (
        <div className="profile-ws-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
          <div className="section-subtitle" style={{ margin: 0 }}>
            Cópialo ahora — no volverá a mostrarse
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code
              style={{
                flex: 1,
                overflowX: "auto",
                padding: "8px 10px",
                background: "var(--bg-soft, rgba(127,127,127,.12))",
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              {justCreated}
            </code>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void copy()}>
              {copied ? "Copiado" : "Copiar"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setJustCreated(null)}>
              Ocultar
            </button>
          </div>
        </div>
      )}

      {(create.error || revoke.error) && (
        <p className="form-error">{errorText(create.error ?? revoke.error)}</p>
      )}

      {list.isPending && <div className="admin-empty">Cargando tokens…</div>}
      {list.error && <p className="form-error">{errorText(list.error)}</p>}

      {list.data &&
        (list.data.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Token</th>
                <th>Creado</th>
                <th>Último uso</th>
                <th>Caduca</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.data.map((token) => (
                <tr key={token.id}>
                  <td>{token.name}</td>
                  <td>
                    <code>{token.prefix}…</code>
                  </td>
                  <td className="td-date">{date(token.created_at)}</td>
                  <td className="td-date">{date(token.last_used_at)}</td>
                  <td className="td-date">{token.expires_at ? date(token.expires_at) : "Nunca"}</td>
                  <td>
                    <span className={`badge badge--${token.status === "active" ? "std" : "warn"}`}>
                      {STATUS_LABEL[token.status]}
                    </span>
                  </td>
                  <td className="td-actions">
                    {token.status === "active" && (
                      <button
                        className="btn btn-ghost btn-sm action-item--danger"
                        disabled={revoke.isPending}
                        onClick={() => {
                          if (confirm(`¿Revocar "${token.name}"? Dejará de funcionar de inmediato.`))
                            revoke.mutate(token.id);
                        }}
                      >
                        Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="profile-empty-msg">Todavía no has creado ningún token.</p>
        ))}
    </>
  );
}
