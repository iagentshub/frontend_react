import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      setValidation(i18n.t("dynamic.text_7fb34a6b37ee"));
    else if (password.length < 8) setValidation(i18n.t("dynamic.text_6dfc197e19bc"));
    else if (password !== confirm) setValidation(i18n.t("dynamic.text_d4c5cdf17c6b"));
    else {
      setValidation(null);
      setStep(2);
    }
  };
  if (register.data?.pending_verification)
    return (
      <AuthCard>
        <div role="status">
          <h2 style={{ marginBottom: 8 }}>{t("legacy.text_c4c0d317797e")}</h2>

          <p className="login-sub" style={{ marginBottom: 24 }}>
            {t("legacy.text_a915202c31b2")}
            <strong>{register.data.email ?? email}</strong>
          </p>

          <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
            {t("legacy.text_21da3ad6bb4d")}
            <br />
            {t("legacy.text_91a801ca191e")}
          </p>

          <Link
            to="/login/"
            className="btn btn-ghost btn-full"
            style={{ marginTop: 24, display: "block", textAlign: "center" }}
          >
            {t("legacy.text_b80454b64a34")}
          </Link>
        </div>
      </AuthCard>
    );
  const error =
    validation ??
    (register.error instanceof ApiError
      ? register.error.message
      : register.error
        ? "Error al crear la cuenta"
        : null);
  return (
    <AuthCard>
      <h2>{t("auth.register_action")}</h2>

      <p className="login-sub">
        {t("legacy.text_e0724fa76790")}
        {step} {t("legacy.text_47fef7ea2970")}
      </p>

      {step === 1 ? (
        <form noValidate onSubmit={credentials}>
          <div className="field">
            <label htmlFor="reg-email">{t("legacy.text_604e4bff227b")}</label>

            <input
              id="reg-email"
              type="email"
              placeholder={t("legacy.text_fd714d2efcca")}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="reg-pw">{t("legacy.text_9d96caf3527a")}</label>

            <div className="field-pw">
              <input
                id="reg-pw"
                type={show ? "text" : "password"}
                placeholder={t("legacy.text_53cf13bdf1c2")}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              <button
                type="button"
                className="pw-toggle"
                tabIndex={-1}
                onClick={() => setShow((value) => !value)}
                aria-label={
                  show ? i18n.t("dynamic.text_a0e898048bbe") : i18n.t("dynamic.text_3d04be8b9cef")
                }
              >
                <Eye closed={show} />
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="reg-pw2">{t("legacy.text_15b5f18926c8")}</label>

            <div className="field-pw">
              <input
                id="reg-pw2"
                type={show2 ? "text" : "password"}
                placeholder={t("legacy.text_3fa21df26ea6")}
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />

              <button
                type="button"
                className="pw-toggle"
                tabIndex={-1}
                onClick={() => setShow2((value) => !value)}
                aria-label={
                  show2 ? i18n.t("dynamic.text_a0e898048bbe") : i18n.t("dynamic.text_3d04be8b9cef")
                }
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

          <button className="btn btn-primary btn-full">{t("legacy.text_4ad2b3125908")}</button>
        </form>
      ) : (
        <>
          <p className="step2-hint">{t("legacy.text_3fc62c75b2ba")}</p>

          <div className="field">
            <label htmlFor="reg-birth">{t("legacy.text_b55ce5e53737")}</label>

            <input
              id="reg-birth"
              type="date"
              value={profile.birth_date ?? ""}
              onChange={(event) => setProfile({ ...profile, birth_date: event.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="reg-gender">{t("legacy.text_713541536b12")}</label>

            <select
              id="reg-gender"
              value={profile.gender ?? ""}
              onChange={(event) => setProfile({ ...profile, gender: event.target.value })}
            >
              <option value="">{t("legacy.text_dda625e9805e")}</option>

              <option value="male">{t("legacy.text_c37df0ae71b9")}</option>

              <option value="female">{t("legacy.text_c1bd5fd999bd")}</option>

              <option value="other">{t("legacy.text_ada1c1ef4a9e")}</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="reg-country">{t("legacy.text_0c664fca6df0")}</label>

            <select
              id="reg-country"
              value={profile.country ?? ""}
              onChange={(event) => setProfile({ ...profile, country: event.target.value })}
            >
              <option value="">{t("legacy.text_6df195fb23ef")}</option>

              {["ES", "MX", "AR", "CO", "CL", "PE", "US", "GB", "DE", "FR"].map((value) => (
                <option value={value} key={value}>
                  {t(`auth.countries.${value}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="reg-phone">{t("legacy.text_99af3763e03b")}</label>

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
              {t("legacy.text_7d1f35bef5b5")}
            </button>

            <button
              className="btn btn-primary"
              onClick={() => register.mutate()}
              disabled={register.isPending}
            >
              {register.isPending ? "Creando…" : "Crear cuenta"}
            </button>
          </div>
        </>
      )}

      <p className="login-register-link">
        {t("legacy.text_65b418702401")}
        <Link to="/login/">{t("about.header.login")}</Link>
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
