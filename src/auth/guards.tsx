import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { ApiError } from "@/api/client";
import { sessionQuery, userSettingsQuery } from "./queries";
import { useTheme, themes, type ThemeId } from "@/theme/theme-context";
import i18n from "@/i18n";

function LoadingSession() {
  return (
    <main className="route-loading" aria-live="polite" aria-busy="true">
      <span className="spinner" aria-hidden="true" />
      <span>Comprobando sesión…</span>
    </main>
  );
}

function SettingsSync() {
  const { data: settings } = useQuery(userSettingsQuery);
  const { setTheme } = useTheme();

  useEffect(() => {
    if (settings?.theme && themes.some((theme) => theme.id === settings.theme)) {
      setTheme(settings.theme as ThemeId);
    }
    if (settings?.language === "es" || settings?.language === "en") {
      void i18n.changeLanguage(settings.language);
    }
  }, [setTheme, settings]);
  return null;
}

export function RequireAuth({ children, role }: { children: ReactNode; role?: "admin" }) {
  const location = useLocation();
  const session = useQuery(sessionQuery);

  if (session.isPending) return <LoadingSession />;
  if (session.error instanceof ApiError && session.error.status === 401) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login/?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  if (session.isError || !session.data) return <Navigate to="/login/" replace />;
  if (role && session.data.role !== role) return <Navigate to="/dashboard/" replace />;

  return (
    <>
      {session.data.role !== "guest" && <SettingsSync />}
      {children}
    </>
  );
}
