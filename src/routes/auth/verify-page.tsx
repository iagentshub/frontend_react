import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { AuthCard } from "./auth-card";

export function VerifyPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const verification = useQuery({
    queryKey: ["verify", token],
    queryFn: ({ signal }) => api.get<{ ok?: boolean }>(`/api/auth/verify?token=${encodeURIComponent(token)}`, signal, false),
    enabled: Boolean(token),
    retry: false,
  });

  return <AuthCard>{!token || verification.isError ? <div role="alert"><h2>Enlace inválido</h2><p className="login-sub" style={{ marginBottom: 24 }}>El enlace de verificación es inválido o ha expirado.</p><Link className="btn btn-ghost btn-full" to="/login/">Volver al login</Link></div> : verification.isSuccess ? <div role="status"><h2>¡Cuenta verificada!</h2><p className="login-sub" style={{ marginBottom: 24 }}>Tu cuenta está activa. Ya puedes entrar.</p><Link className="btn btn-primary btn-full" to="/login/">Iniciar sesión</Link></div> : <div role="status" aria-live="polite"><h2>Verificando cuenta…</h2><p className="login-sub">Un momento por favor</p></div>}</AuthCard>;
}
