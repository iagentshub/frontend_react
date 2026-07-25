import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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
  ["30", "profile.tokens_page.expiry_30"],
  ["90", "profile.tokens_page.expiry_90"],
  ["180", "profile.tokens_page.expiry_180"],
  ["never", "profile.tokens_page.expiry_never"],
];

const STATUS_LABEL_KEY: Record<PersonalToken["status"], string> = {
  active: "profile.tokens_page.status_active",
  revoked: "profile.tokens_page.status_revoked",
  expired: "profile.tokens_page.status_expired",
};

function errorText(error: unknown, t: TFunction) {
  return error instanceof ApiError ? error.message : t("profile.error_generic");
}

function date(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? "—" : parsed.toLocaleDateString("es-ES");
}

export function TokensSection() {
  const { t } = useTranslation();
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
        <div className="section-title">{t("profile.tokens_page.title")}</div>
      </div>
      <p className="profile-empty-msg" style={{ marginTop: 0 }}>
        {t("profile.tokens_page.desc_prefix")}
        <strong>{t("profile.tokens_page.desc_bold")}</strong>
        {t("profile.tokens_page.desc_suffix")}
      </p>

      <form className="admin-toolbar" onSubmit={submit}>
        <input
          className="admin-search"
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("profile.tokens_page.name_placeholder")}
        />
        <select
          className="admin-select"
          value={expiry}
          onChange={(event) => setExpiry(event.target.value as Expiry)}
        >
          {EXPIRY_OPTIONS.map(([value, labelKey]) => (
            <option key={value} value={value}>
              {t(labelKey)}
            </option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" disabled={!name.trim() || create.isPending}>
          {t("profile.tokens_page.create_btn")}
        </button>
      </form>

      {justCreated && (
        <div className="profile-ws-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
          <div className="section-subtitle" style={{ margin: 0 }}>
            {t("profile.tokens_page.copy_now_hint")}
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
              {copied ? t("profile.tokens_page.copied") : t("profile.tokens_page.copy_btn")}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setJustCreated(null)}>
              {t("profile.tokens_page.hide_btn")}
            </button>
          </div>
        </div>
      )}

      {(create.error || revoke.error) && (
        <p className="form-error">{errorText(create.error ?? revoke.error, t)}</p>
      )}

      {list.isPending && <div className="admin-empty">{t("profile.tokens_page.loading")}</div>}
      {list.error && <p className="form-error">{errorText(list.error, t)}</p>}

      {list.data &&
        (list.data.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("profile.tokens_page.col_name")}</th>
                <th>{t("profile.tokens_page.col_token")}</th>
                <th>{t("profile.tokens_page.col_created")}</th>
                <th>{t("profile.tokens_page.col_last_used")}</th>
                <th>{t("profile.tokens_page.col_expires")}</th>
                <th>{t("profile.tokens_page.col_status")}</th>
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
                  <td className="td-date">{token.expires_at ? date(token.expires_at) : t("profile.tokens_page.never_expires")}</td>
                  <td>
                    <span className={`badge badge--${token.status === "active" ? "std" : "warn"}`}>
                      {t(STATUS_LABEL_KEY[token.status])}
                    </span>
                  </td>
                  <td className="td-actions">
                    {token.status === "active" && (
                      <button
                        className="btn btn-ghost btn-sm action-item--danger"
                        disabled={revoke.isPending}
                        onClick={() => {
                          if (confirm(t("profile.tokens_page.confirm_revoke", { name: token.name })))
                            revoke.mutate(token.id);
                        }}
                      >
                        {t("profile.tokens_page.revoke_btn")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="profile-empty-msg">{t("profile.tokens_page.empty")}</p>
        ))}
    </>
  );
}
