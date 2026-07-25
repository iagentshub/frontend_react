import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import { AuthCard } from "./auth-card";

export function VerifyPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const verification = useQuery({
    queryKey: ["verify", token],
    queryFn: ({ signal }) => api.get<{ ok?: boolean }>(`/api/auth/verify?token=${encodeURIComponent(token)}`, signal, false),
    enabled: Boolean(token),
    retry: false,
  });

  return <AuthCard>{!token || verification.isError ? <div role="alert"><h2>{t("auth.verify.error_title")}</h2><p className="login-sub" style={{ marginBottom: 24 }}>{t("auth.verify.error_sub")}</p><Link className="btn btn-ghost btn-full" to="/login/">{t("auth.register.back_to_login")}</Link></div> : verification.isSuccess ? <div role="status"><h2>{t("auth.verify.ok_title")}</h2><p className="login-sub" style={{ marginBottom: 24 }}>{t("auth.verify.ok_sub")}</p><Link className="btn btn-primary btn-full" to="/login/">{t("auth.verify.go_login")}</Link></div> : <div role="status" aria-live="polite"><h2>{t("auth.verify.loading_title")}</h2><p className="login-sub">{t("auth.verify.loading_sub")}</p></div>}</AuthCard>;
}
