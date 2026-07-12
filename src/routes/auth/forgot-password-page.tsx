import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/api/client";
import { AuthCard } from "./auth-card";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const requestReset = useMutation({
    mutationFn: () => api.post<{ ok?: boolean }, { email: string }>("/api/auth/forgot-password", { email: email.trim() }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setValidation("Introduce un email válido");
      return;
    }
    setValidation(null);
    requestReset.mutate();
  };
  const error = validation ?? (requestReset.error instanceof ApiError ? requestReset.error.message : requestReset.error ? "Error de conexión" : null);

  return (
    <AuthCard>
      {requestReset.isSuccess ? (
        <div role="status" style={{ textAlign: "center" }}><p style={{ fontSize: 14, color: "var(--ink-1,#ccc)", lineHeight: 1.6, marginBottom: 24 }}>Si existe una cuenta con ese email, recibirás un enlace para restablecer la contraseña.<br/><span style={{ fontSize: 12, color: "var(--ink-2,#888)" }}>Revisa también la carpeta de spam.</span></p><Link className="btn btn-ghost btn-full" style={{ display: "block", textAlign: "center" }} to="/login/">Volver al login</Link></div>
      ) : (
        <><h2 style={{ marginBottom: 4 }}>Recuperar contraseña</h2><p className="login-sub" style={{ marginBottom: 24 }}>Introduce tu email y te enviaremos un enlace</p><form noValidate onSubmit={submit}><div className="field"><label htmlFor="forgot-email">Email</label><input id="forgot-email" type="email" placeholder="tu@email.com" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>{error && <div className="form-error" role="alert">{error}</div>}<button type="submit" className="btn btn-primary btn-full" disabled={requestReset.isPending}>{requestReset.isPending ? "Enviando…" : "Enviar enlace"}</button></form><p className="login-register-link" style={{ marginTop: 20 }}><Link to="/login/">← Volver al login</Link></p></>
      )}
    </AuthCard>
  );
}
