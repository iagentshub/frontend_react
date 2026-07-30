import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
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
  ["30", "profile.billing.expiry_30"],
  ["90", "profile.billing.expiry_90"],
  ["180", "profile.billing.expiry_180"],
  ["never", "profile.billing.expiry_never"],
];

const STATUS_LABEL: Record<PersonalToken["status"], string> = {
  active: "profile.billing.status_active",
  revoked: "profile.billing.status_revoked",
  expired: "profile.billing.status_expired",
};

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
        <div className="section-title">{t("legacy.text_9be6d58c83b5")}</div>
      </div>

      <p className="profile-empty-msg" style={{ marginTop: 0 }}>
        {t("legacy.text_73ed4f81fe52")}
        <strong>{t("legacy.text_7521ce7e1832")}</strong>
        {t("legacy.text_6d1e3b676e00")}
      </p>

      <form className="admin-toolbar" onSubmit={submit}>
        <input
          className="admin-search"
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("legacy.text_a6ad2a13fb11")}
        />

        <select
          className="admin-select"
          value={expiry}
          onChange={(event) => setExpiry(event.target.value as Expiry)}
        >
          {EXPIRY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </select>

        <button className="btn btn-primary btn-sm" disabled={!name.trim() || create.isPending}>
          {t("legacy.text_fedaf223469e")}
        </button>
      </form>

      {justCreated && (
        <div
          className="profile-group-card"
          style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}
        >
          <div className="section-subtitle" style={{ margin: 0 }}>
            {t("legacy.text_c9298667d2b7")}
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

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setJustCreated(null)}
            >
              {t("legacy.text_4f58415a4d62")}
            </button>
          </div>
        </div>
      )}

      {(create.error || revoke.error) && (
        <p className="form-error">{errorText(create.error ?? revoke.error)}</p>
      )}

      {list.isPending && <div className="admin-empty">{t("legacy.text_119975eaaec7")}</div>}

      {list.error && <p className="form-error">{errorText(list.error)}</p>}

      {list.data &&
        (list.data.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("agents.modal.field_name")}</th>

                <th>{t("docs.keywords.token_title")}</th>

                <th>{t("teams.table.col_date")}</th>

                <th>{t("legacy.text_1d6e00bdcb2f")}</th>

                <th>{t("legacy.text_851c08f2c851")}</th>

                <th>{t("agents.blueprint.status")}</th>

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

                  <td className="td-date">
                    {token.expires_at ? date(token.expires_at) : t("profile.billing.never")}
                  </td>

                  <td>
                    <span className={`badge badge--${token.status === "active" ? "std" : "warn"}`}>
                      {t(STATUS_LABEL[token.status])}
                    </span>
                  </td>

                  <td className="td-actions">
                    {token.status === "active" && (
                      <button
                        className="btn btn-ghost btn-sm action-item--danger"
                        disabled={revoke.isPending}
                        onClick={() => {
                          if (
                            confirm(
                              i18n.t("dynamic.token_revoke_confirm", {
                                name: token.name,
                              }),
                            )
                          )
                            revoke.mutate(token.id);
                        }}
                      >
                        {t("legacy.text_9179b17f05e3")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="profile-empty-msg">{t("legacy.text_fd9340e4e3ec")}</p>
        ))}
    </>
  );
}
