import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "@/api/client";
import { AuthCard } from "./auth-card";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const reset = useMutation({
    mutationFn: () =>
      api.post<{ ok?: boolean }, { token: string; password: string }>("/api/auth/reset-password", {
        token,
        password,
      }),
  });

  if (!token) return <InvalidReset />;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) setValidation(i18n.t("dynamic.text_6dfc197e19bc"));
    else if (password !== confirmation) setValidation(i18n.t("dynamic.text_d4c5cdf17c6b"));
    else {
      setValidation(null);
      reset.mutate();
    }
  };
  if (reset.isSuccess)
    return (
      <AuthCard>
        <div role="status">
          <h2>{t("profile.password.saved")}</h2>
          <p className="login-sub" style={{ marginBottom: 24 }}>
            {t("legacy.text_e6f4abbd1330")}
          </p>
          <Link className="btn btn-primary btn-full" to="/login/">
            {t("legacy.text_11f3527b65ac")}
          </Link>
        </div>
      </AuthCard>
    );
  if (
    reset.error instanceof ApiError &&
    reset.error.status === 400 &&
    reset.error.message.toLowerCase().includes("expirad")
  )
    return <InvalidReset />;
  const error =
    validation ??
    (reset.error instanceof ApiError
      ? reset.error.message
      : reset.error
        ? i18n.t("dynamic.text_e81ee946f7a0")
        : null);

  return (
    <AuthCard>
      <h2 style={{ marginBottom: 4 }}>{t("profile.password.field_new")}</h2>
      <p className="login-sub" style={{ marginBottom: 24 }}>
        {t("legacy.text_fe5582c6d6b9")}
      </p>
      <form noValidate onSubmit={submit}>
        <div className="field">
          <label htmlFor="reset-pw">{t("profile.password.field_new")}</label>
          <div className="field-pw">
            <input
              id="reset-pw"
              type={showPassword ? "text" : "password"}
              placeholder={t("legacy.text_53cf13bdf1c2")}
              minLength={8}
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="pw-toggle"
              tabIndex={-1}
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword
                  ? i18n.t("dynamic.text_a0e898048bbe")
                  : i18n.t("dynamic.text_3d04be8b9cef")
              }
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="reset-pw2">{t("profile.password.field_confirm")}</label>
          <input
            id="reset-pw2"
            type="password"
            placeholder={t("legacy.text_3fa21df26ea6")}
            minLength={8}
            required
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn-primary btn-full" disabled={reset.isPending}>
          {reset.isPending ? "Guardando…" : i18n.t("dynamic.text_147b925b769c")}
        </button>
      </form>
    </AuthCard>
  );
}

function InvalidReset() {
  const { t } = useTranslation();
  return (
    <AuthCard>
      <div role="alert" style={{ textAlign: "center" }}>
        <h2 style={{ marginBottom: 8 }}>{t("legacy.text_362415519e8f")}</h2>
        <p className="login-sub" style={{ marginBottom: 24 }}>
          {t("legacy.text_7ab23116bdf6")}
        </p>
        <Link
          className="btn btn-ghost btn-full"
          style={{ display: "block", textAlign: "center" }}
          to="/forgot-password/"
        >
          {t("legacy.text_27522251e27a")}
        </Link>
      </div>
    </AuthCard>
  );
}
