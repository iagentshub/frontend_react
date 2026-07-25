import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
    mutationFn: () => api.post<{ ok?: boolean }, { token: string; password: string }>("/api/auth/reset-password", { token, password }),
  });

  if (!token) return <InvalidReset />;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) setValidation(t("auth.reset_password.error_short_password"));
    else if (password !== confirmation) setValidation(t("auth.reset_password.error_password_mismatch"));
    else { setValidation(null); reset.mutate(); }
  };
  if (reset.isSuccess) return <AuthCard><div role="status"><h2>{t("auth.reset_password.ok_title")}</h2><p className="login-sub" style={{ marginBottom: 24 }}>{t("auth.reset_password.ok_sub")}</p><Link className="btn btn-primary btn-full" to="/login/">{t("auth.reset_password.go_to_login")}</Link></div></AuthCard>;
  if (reset.error instanceof ApiError && reset.error.status === 400 && reset.error.message.toLowerCase().includes("expirad")) return <InvalidReset />;
  const error = validation ?? (reset.error instanceof ApiError ? reset.error.message : reset.error ? t("auth.reset_password.error_generic") : null);

  return <AuthCard><h2 style={{ marginBottom: 4 }}>{t("auth.reset_password.title")}</h2><p className="login-sub" style={{ marginBottom: 24 }}>{t("auth.reset_password.sub")}</p><form noValidate onSubmit={submit}><div className="field"><label htmlFor="reset-pw">{t("auth.reset_password.new_password_label")}</label><div className="field-pw"><input id="reset-pw" type={showPassword ? "text" : "password"} placeholder={t("auth.register.password_placeholder")} minLength={8} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="pw-toggle" tabIndex={-1} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t("auth.hide_password") : t("auth.show_password")}><svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg></button></div></div><div className="field"><label htmlFor="reset-pw2">{t("auth.reset_password.confirm_password_label")}</label><input id="reset-pw2" type="password" placeholder={t("auth.register.confirm_password_placeholder")} minLength={8} required autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>{error && <div className="form-error" role="alert">{error}</div>}<button className="btn btn-primary btn-full" disabled={reset.isPending}>{reset.isPending ? t("auth.reset_password.save_btn_loading") : t("auth.reset_password.save_btn")}</button></form></AuthCard>;
}

function InvalidReset() {
  const { t } = useTranslation();
  return <AuthCard><div role="alert" style={{ textAlign: "center" }}><h2 style={{ marginBottom: 8 }}>{t("auth.reset_password.invalid_title")}</h2><p className="login-sub" style={{ marginBottom: 24 }}>{t("auth.reset_password.invalid_sub")}</p><Link className="btn btn-ghost btn-full" style={{ display: "block", textAlign: "center" }} to="/forgot-password/">{t("auth.reset_password.request_new_link")}</Link></div></AuthCard>;
}
