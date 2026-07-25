import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { AuthCard } from "./auth-card";

export function VerifyPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const verification = useQuery({
    queryKey: ["verify", token],
    queryFn: ({ signal }) =>
      api.get<{ ok?: boolean }>(
        `/api/auth/verify?token=${encodeURIComponent(token)}`,
        signal,
        false,
      ),
    enabled: Boolean(token),
    retry: false,
  });

  return (
    <AuthCard>
      {!token || verification.isError ? (
        <div role="alert">
          <h2>{t("legacy.text_362415519e8f")}</h2>
          <p className="login-sub" style={{ marginBottom: 24 }}>
            {t("legacy.text_a5db2cebc526")}
          </p>
          <Link className="btn btn-ghost btn-full" to="/login/">
            {t("legacy.text_b80454b64a34")}
          </Link>
        </div>
      ) : verification.isSuccess ? (
        <div role="status">
          <h2>{t("legacy.text_6d61ecf31ef9")}</h2>
          <p className="login-sub" style={{ marginBottom: 24 }}>
            {t("legacy.text_f6d2c8585cff")}
          </p>
          <Link className="btn btn-primary btn-full" to="/login/">
            {t("about.header.login")}
          </Link>
        </div>
      ) : (
        <div role="status" aria-live="polite">
          <h2>{t("legacy.text_e05abe86ca49")}</h2>
          <p className="login-sub">{t("legacy.text_cc25cc379d85")}</p>
        </div>
      )}
    </AuthCard>
  );
}
