import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "@/api/client";
import { AuthCard } from "./auth-card";

export function ResetPasswordPage() {
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
    if (password.length < 8) setValidation("La contraseña debe tener al menos 8 caracteres");
    else if (password !== confirmation) setValidation("Las contraseñas no coinciden");
    else { setValidation(null); reset.mutate(); }
  };
  if (reset.isSuccess) return <AuthCard><div role="status"><h2>Contraseña actualizada</h2><p className="login-sub" style={{ marginBottom: 24 }}>Ya puedes iniciar sesión con tu nueva contraseña.</p><Link className="btn btn-primary btn-full" to="/login/">Ir al login</Link></div></AuthCard>;
  if (reset.error instanceof ApiError && reset.error.status === 400 && reset.error.message.toLowerCase().includes("expirad")) return <InvalidReset />;
  const error = validation ?? (reset.error instanceof ApiError ? reset.error.message : reset.error ? "Error de conexión" : null);

  return <AuthCard><h2 style={{ marginBottom: 4 }}>Nueva contraseña</h2><p className="login-sub" style={{ marginBottom: 24 }}>Elige una contraseña segura para tu cuenta</p><form noValidate onSubmit={submit}><div className="field"><label htmlFor="reset-pw">Nueva contraseña</label><div className="field-pw"><input id="reset-pw" type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres" minLength={8} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="pw-toggle" tabIndex={-1} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}><svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg></button></div></div><div className="field"><label htmlFor="reset-pw2">Confirmar contraseña</label><input id="reset-pw2" type="password" placeholder="Repite la contraseña" minLength={8} required autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>{error && <div className="form-error" role="alert">{error}</div>}<button className="btn btn-primary btn-full" disabled={reset.isPending}>{reset.isPending ? "Guardando…" : "Guardar contraseña"}</button></form></AuthCard>;
}

function InvalidReset() {
  return <AuthCard><div role="alert" style={{ textAlign: "center" }}><h2 style={{ marginBottom: 8 }}>Enlace inválido</h2><p className="login-sub" style={{ marginBottom: 24 }}>El enlace ha expirado o ya fue usado.</p><Link className="btn btn-ghost btn-full" style={{ display: "block", textAlign: "center" }} to="/forgot-password/">Solicitar nuevo enlace</Link></div></AuthCard>;
}
