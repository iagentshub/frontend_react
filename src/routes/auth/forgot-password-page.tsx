import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/api/client";
import { AuthCard } from "./auth-card";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const requestReset = useMutation({
    mutationFn: () =>
      api.post<{ ok?: boolean }, { email: string }>("/api/auth/forgot-password", {
        email: email.trim(),
      }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setValidation(i18n.t("dynamic.text_90ab3644d955"));
      return;
    }
    setValidation(null);
    requestReset.mutate();
  };
  const error =
    validation ??
    (requestReset.error instanceof ApiError
      ? requestReset.error.message
      : requestReset.error
        ? i18n.t("dynamic.text_e81ee946f7a0")
        : null);

  return (
    <AuthCard>
      {requestReset.isSuccess ? (
        <div role="status" style={{ textAlign: "center" }}>
          <p
            style={{ fontSize: 14, color: "var(--ink-1,#ccc)", lineHeight: 1.6, marginBottom: 24 }}
          >
            {t("legacy.text_ba9a3d2a85f6")}
            <br />
            <span style={{ fontSize: 12, color: "var(--ink-2,#888)" }}>
              {t("legacy.text_99cb52cd4267")}
            </span>
          </p>
          <Link
            className="btn btn-ghost btn-full"
            style={{ display: "block", textAlign: "center" }}
            to="/login/"
          >
            {t("legacy.text_b80454b64a34")}
          </Link>
        </div>
      ) : (
        <>
          <h2 style={{ marginBottom: 4 }}>{t("legacy.text_c655cfbac5dc")}</h2>
          <p className="login-sub" style={{ marginBottom: 24 }}>
            {t("legacy.text_ed3a036490ff")}
          </p>
          <form noValidate onSubmit={submit}>
            <div className="field">
              <label htmlFor="forgot-email">{t("admin.table.email")}</label>
              <input
                id="forgot-email"
                type="email"
                placeholder={t("legacy.text_fd714d2efcca")}
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={requestReset.isPending}
            >
              {requestReset.isPending ? "Enviando…" : "Enviar enlace"}
            </button>
          </form>
          <p className="login-register-link" style={{ marginTop: 20 }}>
            <Link to="/login/">{t("legacy.text_dfbb73924efc")}</Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}
