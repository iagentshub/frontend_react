import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

export function RouteLoading() {
  return <main className="page-content route-loading" aria-live="polite"><span className="spinner" />Cargando…</main>;
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Error inesperado";
  return (
    <main className="route-error" role="alert">
      <h1>No se pudo cargar esta pantalla</h1>
      <p>{message}</p>
      <button className="btn btn-primary" onClick={() => location.reload()}>Reintentar</button>
    </main>
  );
}

export function NotFoundPage() {
  return <main className="route-error"><h1>404</h1><p>La página solicitada no existe.</p><Link className="btn btn-primary" to="/dashboard/">Volver al dashboard</Link></main>;
}

export function MigrationPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <main className="page-content">
      <div className="page-header">
        <div><h1 className="page-title">{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>
      </div>
      <div className="empty-state"><p>Esta ruta está preparada para su migración vertical.</p></div>
    </main>
  );
}
