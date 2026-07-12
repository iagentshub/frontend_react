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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) setValidation("Email inválido");
    else if (password.length < 8) setValidation("La contraseña debe tener al menos 8 caracteres");
    else if (password !== confirm) setValidation("Las contraseñas no coinciden");
    else {
      setValidation(null);
      setStep(2);
    }
  };
  if (register.data?.pending_verification)
    return (
      <AuthCard>
        <div role="status">
          <h2 style={{ marginBottom: 8 }}>Revisa tu correo</h2>
          <p className="login-sub" style={{ marginBottom: 24 }}>
            Hemos enviado un enlace de verificación a{" "}
            <strong>{register.data.email ?? email}</strong>
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Haz clic en el enlace del correo para activar tu cuenta.
            <br />
            Revisa también la carpeta de spam si no lo ves.
          </p>
          <Link
            to="/login/"
            className="btn btn-ghost btn-full"
            style={{ marginTop: 24, display: "block", textAlign: "center" }}
          >
            Volver al login
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
      <h2>Crear cuenta</h2>
      <p className="login-sub">Paso {step} de 2</p>
      {step === 1 ? (
        <form noValidate onSubmit={credentials}>
          <div className="field">
            <label htmlFor="reg-email">Email *</label>
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
            <label htmlFor="reg-pw">Contraseña *</label>
            <div className="field-pw">
              <input
                id="reg-pw"
                type={show ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="pw-toggle"
                tabIndex={-1}
                onClick={() => setShow((value) => !value)}
                aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <Eye closed={show} />
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="reg-pw2">Confirmar contraseña *</label>
            <div className="field-pw">
              <input
                id="reg-pw2"
                type={show2 ? "text" : "password"}
                placeholder="Repite la contraseña"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
              <button
                type="button"
                className="pw-toggle"
                tabIndex={-1}
                onClick={() => setShow2((value) => !value)}
                aria-label={show2 ? "Ocultar contraseña" : "Mostrar contraseña"}
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
          <button className="btn btn-primary btn-full">Continuar →</button>
        </form>
      ) : (
        <>
          <p className="step2-hint">Completa tu perfil (opcional)</p>
          <div className="field">
            <label htmlFor="reg-birth">Fecha de nacimiento</label>
            <input
              id="reg-birth"
              type="date"
              value={profile.birth_date ?? ""}
              onChange={(event) => setProfile({ ...profile, birth_date: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="reg-gender">Género</label>
            <select
              id="reg-gender"
              value={profile.gender ?? ""}
              onChange={(event) => setProfile({ ...profile, gender: event.target.value })}
            >
              <option value="">Prefiero no decir</option>
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="reg-country">País</label>
            <select
              id="reg-country"
              value={profile.country ?? ""}
              onChange={(event) => setProfile({ ...profile, country: event.target.value })}
            >
              <option value="">Selecciona tu país</option>
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
            <label htmlFor="reg-phone">Teléfono</label>
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
              Omitir
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
        ¿Ya tienes cuenta? <Link to="/login/">Iniciar sesión</Link>
      </p>
      <div className="login-explore">
        <Link to="/pricing/">Precios</Link>
        <span className="login-explore-sep" />
        <Link to="/about">¿Qué es esto?</Link>
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

