import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, Link, useLocation, useRouteError } from "react-router-dom";
import { Seo } from "@/components/seo";

export function RouteLoading() {
  const { t } = useTranslation();
  return (
    <main className="page-content route-loading" aria-live="polite">
      <span className="spinner" />
      {t("admin.logs.loading")}
    </main>
  );
}

export function RouteErrorBoundary() {
  const { t } = useTranslation();
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : t("common.ui.unexpected_error");
  return (
    <main className="route-error" role="alert">
      <h1>{t("legacy.text_55572737278f")}</h1>

      <p>{message}</p>

      <button className="btn btn-primary" onClick={() => location.reload()}>
        {t("legacy.text_adec7b4f2351")}
      </button>
    </main>
  );
}

export function NotFoundPage() {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <main className="route-error">
      {/* El fallback SPA de nginx devuelve 200 en rutas inexistentes: sin este
          noindex serían soft 404 indexables. */}
      <Seo
        title={t("seo.not_found.title")}
        description={t("seo.not_found.description")}
        path={location.pathname}
        noindex
      />

      <h1>404</h1>
      <p>{t("legacy.text_d7a4db81af0a")}</p>
      <Link className="btn btn-primary" to="/dashboard/">
        {t("legacy.text_3d79019a380f")}
      </Link>
    </main>
  );
}

export function MigrationPage({ title, subtitle }: { title: string; subtitle?: string }) {
  const { t } = useTranslation();
  return (
    <main className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="empty-state">
        <p>{t("legacy.text_62ef77aa6ff7")}</p>
      </div>
    </main>
  );
}
