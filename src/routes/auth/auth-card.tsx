import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLoginBody } from "./use-login-body";
import "@/styles/routes/login/login.css";

export function AuthCard({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  useLoginBody();
  const wide = useLocation().pathname.startsWith("/register");
  return (
    <main className="login-wrap login-wrap--narrow">
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
