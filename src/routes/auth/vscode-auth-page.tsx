import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "@/api/client";
import { sessionQuery } from "@/auth/queries";
import "@/styles/routes/login/login.css";

/** Editores que pueden recibir el callback. Misma lista que el backend. */
const SCHEMES = ["vscode", "vscode-insiders", "vscodium", "cursor", "windsurf"];
const AUTHORITY = "iagentshub.iagentshub";

/**
 * El backend ya validó el callback al redirigir aquí, pero a esta página se
 * puede llegar escribiendo la URL a mano. Como al final hacemos un
 * `location.href = callback`, revalidamos: sin esto sería un `javascript:` a un
 * clic de distancia.
 */
function safeCallback(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const scheme = url.protocol.replace(/:$/, "");
    return SCHEMES.includes(scheme) && url.host === AUTHORITY ? value : null;
  } catch {
    return null;
  }
}

export function VsCodeAuthPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [done, setDone] = useState(false);
  const session = useQuery(sessionQuery);

  const state = params.get("state") ?? "";
  const callback = safeCallback(params.get("callback"));

  const authorize = useMutation({
    mutationFn: () => api.post<{ code: string }>("/api/auth/vscode/authorize", { state }),
    onSuccess: ({ code }) => {
      setDone(true);
      const target = new URL(callback!);
      target.searchParams.set("code", code);
      target.searchParams.set("state", state);
      window.location.href = target.toString();
    },
  });

  if (!callback || !state) {
    return (
      <Card title={t("legacy.text_958737fc4c80")}>
        <p className="login-sub">{t("legacy.text_2521701d27cd")}</p>
      </Card>
    );
  }

  if (done) {
    return (
      <Card title={t("agents.export.done")}>
        <p className="login-sub">{t("legacy.text_d992b114a1e6")}</p>
      </Card>
    );
  }

  const error =
    authorize.error instanceof ApiError
      ? authorize.error.message
      : authorize.error
        ? i18n.t("dynamic.text_5433662a4430")
        : null;

  return (
    <Card title={t("legacy.text_72c2c2796c16")}>
      <p className="login-sub">
        {t("legacy.text_dad210951386")}
        <strong>{session.data?.username}</strong> {t("legacy.text_19a5d8494f83")}
      </p>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-full"
        disabled={authorize.isPending}
        onClick={() => authorize.mutate()}
      >
        {authorize.isPending ? "Autorizando…" : "Autorizar"}
      </button>

      <button type="button" className="btn btn-ghost btn-full" onClick={() => window.close()}>
        {t("agents.scan.folder_cancel_btn")}
      </button>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="login-wrap login-wrap--narrow">
      <section className="login-card" aria-labelledby="vscode-auth-title">
        <h2 id="vscode-auth-title">{title}</h2>

        {children}
      </section>
    </main>
  );
}
