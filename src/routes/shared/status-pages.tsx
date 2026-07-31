import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, Link, useLocation, useRouteError } from "react-router-dom";
import { Seo } from "@/components/seo";

export function RouteLoading() {
  const { t } = useTranslation();
  return (
    <main className="page-content route-loading" aria-live="polite">
      <span className="spinner" />
      {t("common.status.loading")}
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
      <h1>{t("common.status.load_error")}</h1>

      <p>{message}</p>

      <button className="btn btn-primary" onClick={() => location.reload()}>
        {t("common.status.retry")}
      </button>
    </main>
  );
}

export function NotFoundPage() {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <main className="route-error">
      {/* El noindex protege también el entorno de desarrollo; en producción
          nginx sirve esta pantalla con estado HTTP 404 real. */}
      <Seo
        title={t("seo.not_found.title")}
        description={t("seo.not_found.description")}
        path={location.pathname}
        noindex
      />

      <h1>404</h1>
      <p>{t("common.status.not_found")}</p>
      <Link className="btn btn-primary" to="/">
        {t("common.status.back_home")}
      </Link>
    </main>
  );
}
