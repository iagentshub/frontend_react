import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "@/api/client";
import { queryKeys } from "@/api/query-client";
import { AuthCard } from "./auth-card";
import "@/styles/routes/register/register.css";

interface PublicSettings {
  registration?: string;
}
interface RegisterResponse {
  pending_verification?: boolean;
  email?: string;
}
interface ProfileFields {
  birth_date?: string;
  gender?: string;
  country?: string;
  phone?: string;
}

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate(),
    settings = useQuery({
      queryKey: queryKeys.platform,
      queryFn: ({ signal }) =>
        api.get<PublicSettings>("/api/settings/platform/public", signal, false),
    });
  const [step, setStep] = useState(1),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [show, setShow] = useState(false),
    [show2, setShow2] = useState(false),
    [validation, setValidation] = useState<string | null>(null),
    [profile, setProfile] = useState<ProfileFields>({});
  useEffect(() => {
    if (settings.data?.registration === "closed") void navigate("/login/", { replace: true });
  }, [navigate, settings.data]);
  const register = useMutation({
    mutationFn: () =>
      api.post<RegisterResponse>("/api/auth/register", {
        email: email.trim(),
        password,
        plan: "free",
        ...Object.fromEntries(Object.entries(profile).filter(([, value]) => value)),
      }),
    onSuccess: (data) => {
      if (!data.pending_verification) location.replace("/dashboard/");
    },
  });
  const credentials = (event: FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) setValidation(t("auth.register.error_invalid_email"));
    else if (password.length < 8) setValidation(t("auth.register.error_short_password"));
    else if (password !== confirm) setValidation(t("auth.register.error_password_mismatch"));
    else {
      setValidation(null);
      setStep(2);
    }
  };
  if (register.data?.pending_verification)
    return (
      <AuthCard>
        <div role="status">
          <h2 style={{ marginBottom: 8 }}>{t("auth.register.check_email_title")}</h2>
          <p className="login-sub" style={{ marginBottom: 24 }}>
            {t("auth.register.check_email_sub")}{" "}
            <strong>{register.data.email ?? email}</strong>
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
            {t("auth.register.check_email_body_line1")}
            <br />
            {t("auth.register.check_email_body_line2")}
          </p>
          <Link
            to="/login/"
            className="btn btn-ghost btn-full"
            style={{ marginTop: 24, display: "block", textAlign: "center" }}
          >
            {t("auth.register.back_to_login")}
          </Link>
        </div>
      </AuthCard>
    );
  const error =
    validation ??
    (register.error instanceof ApiError
      ? register.error.message
      : register.error
        ? t("auth.register.error_generic")
        : null);
  return (
    <AuthCard>
      <h2>{t("auth.register.title")}</h2>
      <p className="login-sub">{t("auth.register.step_label", { step })}</p>
      {step === 1 ? (
        <form noValidate onSubmit={credentials}>
          <div className="field">
            <label htmlFor="reg-email">{t("auth.register.email_label")}</label>
            <input
              id="reg-email"
              type="email"
              placeholder="tu@email.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="reg-pw">{t("auth.register.password_label")}</label>
            <div className="field-pw">
              <input
                id="reg-pw"
                type={show ? "text" : "password"}
                placeholder={t("auth.register.password_placeholder")}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="pw-toggle"
                tabIndex={-1}
                onClick={() => setShow((value) => !value)}
                aria-label={show ? t("auth.hide_password") : t("auth.show_password")}
              >
                <Eye closed={show} />
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="reg-pw2">{t("auth.register.confirm_password_label")}</label>
            <div className="field-pw">
              <input
                id="reg-pw2"
                type={show2 ? "text" : "password"}
                placeholder={t("auth.register.confirm_password_placeholder")}
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
              <button
                type="button"
                className="pw-toggle"
                tabIndex={-1}
                onClick={() => setShow2((value) => !value)}
                aria-label={show2 ? t("auth.hide_password") : t("auth.show_password")}
              >
                <Eye closed={show2} />
              </button>
            </div>
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="btn btn-primary btn-full">{t("auth.register.continue_btn")}</button>
        </form>
      ) : (
        <>
          <p className="step2-hint">{t("auth.register.profile_hint")}</p>
          <div className="field">
            <label htmlFor="reg-birth">{t("auth.register.birth_date_label")}</label>
            <input
              id="reg-birth"
              type="date"
              value={profile.birth_date ?? ""}
              onChange={(event) => setProfile({ ...profile, birth_date: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="reg-gender">{t("auth.register.gender_label")}</label>
            <select
              id="reg-gender"
              value={profile.gender ?? ""}
              onChange={(event) => setProfile({ ...profile, gender: event.target.value })}
            >
              <option value="">{t("auth.register.gender_none")}</option>
              <option value="male">{t("auth.register.gender_male")}</option>
              <option value="female">{t("auth.register.gender_female")}</option>
              <option value="other">{t("auth.register.gender_other")}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="reg-country">{t("auth.register.country_label")}</label>
            <select
              id="reg-country"
              value={profile.country ?? ""}
              onChange={(event) => setProfile({ ...profile, country: event.target.value })}
            >
              <option value="">{t("auth.register.country_placeholder")}</option>
              {[
                ["ES", "España"],
                ["MX", "México"],
                ["AR", "Argentina"],
                ["CO", "Colombia"],
                ["CL", "Chile"],
                ["PE", "Perú"],
                ["US", "Estados Unidos"],
                ["GB", "Reino Unido"],
                ["DE", "Alemania"],
                ["FR", "Francia"],
              ].map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="reg-phone">{t("auth.register.phone_label")}</label>
            <input
              id="reg-phone"
              type="tel"
              placeholder="+34 600 000 000"
              value={profile.phone ?? ""}
              onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
            />
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="reg-step2-btns">
            <button
              className="btn btn-ghost"
              onClick={() => register.mutate()}
              disabled={register.isPending}
            >
              {t("auth.register.skip_btn")}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => register.mutate()}
              disabled={register.isPending}
            >
              {register.isPending ? t("auth.register.finish_btn_loading") : t("auth.register.finish_btn")}
            </button>
          </div>
        </>
      )}
      <p className="login-register-link">
        {t("auth.register.already_have_account")} <Link to="/login/">{t("auth.register.sign_in_link")}</Link>
      </p>
      <div className="login-explore">
        <Link to="/pricing/">{t("auth.pricing_link")}</Link>
        <span className="login-explore-sep" />
        <Link to="/about">{t("auth.about_link")}</Link>
      </div>
    </AuthCard>
  );
}
function Eye({ closed }: { closed: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      {closed && (
        <line
          x1="3"
          y1="3"
          x2="15"
          y2="15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

