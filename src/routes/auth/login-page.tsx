import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "@/api/client";
import { queryClient } from "@/api/query-client";
import { platformQuery, sessionQuery } from "@/auth/queries";
import { safeRedirect } from "./safe-redirect";
import "@/styles/routes/login/login.css";

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const session = useQuery(sessionQuery);
  const platform = useQuery(platformQuery);

  useEffect(() => {
    document.body.classList.add("login-page");
    return () => document.body.classList.remove("login-page");
  }, []);

  useEffect(() => {
    if (session.data) void navigate(redirect, { replace: true });
  }, [navigate, redirect, session.data]);

  const login = useMutation({
    mutationFn: () => api.post<{ ok?: boolean }, { email: string; password: string }>("/api/auth/login", { email: email.trim(), password }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey });
      void navigate(redirect, { replace: true });
    },
  });
  const guest = useMutation({
    mutationFn: () => api.post<{ ok?: boolean }>("/api/auth/guest", {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey });
      void navigate(redirect, { replace: true });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate();
  };
  const error = login.error instanceof ApiError ? login.error.message : login.error ? t("auth.error_connection") : null;
  const showRegister = platform.data?.registration === "open" && platform.data.billing_enabled === false;

  return (
    <main className="login-wrap login-wrap--narrow">
      <section className="login-card login-card--wide" aria-labelledby="login-title">
        <Link className="login-card-logo" to="/">iAgents<span>Hub</span></Link>
        <h2 id="login-title">{t("auth.card_title")}</h2>
        <p className="login-sub">{t("auth.card_sub")}</p>
        <form autoComplete="on" noValidate onSubmit={submit}>
          <div className="field">
            <label htmlFor="login-email">{t("auth.field_email")}</label>
            <input id="login-email" type="email" name="email" autoComplete="email" placeholder="tu@email.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="login-password">{t("auth.field_password")}</label>
            <div className="field-pw">
              <input id="login-password" type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" placeholder="••••••••" required value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" className="pw-toggle" tabIndex={-1} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />{showPassword && <path d="M3 3l12 12" stroke="currentColor" strokeWidth="1.5" />}</svg>
              </button>
            </div>
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={login.isPending}>{login.isPending ? t("auth.login_btn_loading") : t("auth.login_btn")}</button>
          <p style={{ textAlign: "right", margin: "8px 0 0" }}><Link to="/forgot-password/" style={{ fontSize: 12, color: "var(--ink-2,#888)" }}>{t("auth.forgot_password")}</Link></p>
        </form>
        <div className="login-divider"><span>{t("auth.divider")}</span></div>
        <div className="login-oauth-row" aria-label="Proveedores disponibles próximamente">
          <button type="button" className="login-oauth-btn" disabled title="Próximamente" aria-label="Google (próximamente)"><svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.1 5.1 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg></button>
          <button type="button" className="login-oauth-btn" disabled title="Próximamente" aria-label="Apple (próximamente)"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg></button>
          <button type="button" className="login-oauth-btn" disabled title="Próximamente" aria-label="Microsoft (próximamente)"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="10" height="10" fill="#F25022"/><rect x="13" y="1" width="10" height="10" fill="#7FBA00"/><rect x="1" y="13" width="10" height="10" fill="#00A4EF"/><rect x="13" y="13" width="10" height="10" fill="#FFB900"/></svg></button>
        </div>
        {platform.data?.guest_enabled && <button className="btn btn-ghost btn-full" disabled={guest.isPending} onClick={() => guest.mutate()}>{t("auth.guest_login")}</button>}
        {showRegister && <p className="login-register-link"><span>{t("auth.register_text")}</span> <Link to="/register/">{t("auth.register_action")}</Link></p>}
        <div className="login-explore">
          {platform.data?.billing_enabled && <Link to="/pricing/">{t("auth.pricing_link")}</Link>}
          {platform.data?.billing_enabled && <span className="login-explore-sep login-lang-sep" />}
          <button className="login-lang-btn" onClick={() => void i18n.changeLanguage(i18n.language === "es" ? "en" : "es")}>{i18n.language.toUpperCase()}</button>
        </div>
      </section>
    </main>
  );
}

