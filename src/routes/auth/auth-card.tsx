import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Seo } from "@/components/seo";
import { useLoginBody } from "./use-login-body";
import "@/styles/routes/login/login.css";

export function AuthCard({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  useLoginBody();
  const { pathname } = useLocation();
  const wide = pathname.startsWith("/register");
  // Registro tiene copy propio; el resto de pantallas de cuenta (verificar,
  // recuperar, restablecer) comparten metadatos genéricos. Todas noindex.
  const seoKey = wide ? "register" : "account";
  return (
    <main className="login-wrap login-wrap--narrow">
      <Seo
        title={t(`seo.${seoKey}.title`)}
        description={t(`seo.${seoKey}.description`)}
        path={pathname}
        noindex
      />
      <section className={`login-card${wide ? " login-card--wide" : ""}`}>
        <Link className="login-card-logo" to="/">
          {t("legacy.text_1fda9fc57a04")}
          <span>{t("legacy.text_a38df5fc50fb")}</span>
        </Link>

        {children}
      </section>
    </main>
  );
}
