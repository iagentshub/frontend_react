/* eslint-disable react-refresh/only-export-components -- route modules intentionally compose lazy components */
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import i18n, { type SupportedLanguage } from "@/i18n";
import { NotFoundPage, RouteErrorBoundary, RouteLoading } from "@/routes/shared/status-pages";
import { appPath } from "@/app/app-paths";

const LEGACY_PRIVATE_PATHS = [
  "admin",
  "agents",
  "checkout",
  "connections",
  "dashboard",
  "explore",
  "forgot-password",
  "knowledge",
  "labels",
  "login",
  "manager",
  "memory",
  "orchestrations",
  "profile",
  "register",
  "reset-password",
  "u",
  "verify",
  "vscode-auth",
  "workflows",
] as const;

const HomePage = lazy(() =>
  import("@/routes/public/home-page").then((module) => ({ default: module.HomePage })),
);
const AboutPage = lazy(() =>
  import("@/routes/public/about-page").then((module) => ({ default: module.AboutPage })),
);
const DocsPage = lazy(() =>
  import("@/routes/public/docs-page").then((module) => ({ default: module.DocsPage })),
);
const SupportPage = lazy(() =>
  import("@/routes/public/support-page").then((module) => ({ default: module.SupportPage })),
);
const PricingPage = lazy(() =>
  import("@/routes/public/pricing-page").then((module) => ({ default: module.PricingPage })),
);
const PrivacyPage = lazy(() =>
  import("@/routes/public/legal-page").then((module) => ({ default: module.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import("@/routes/public/legal-page").then((module) => ({ default: module.TermsPage })),
);

function lazyRoute(element: ReactNode) {
  return <Suspense fallback={<RouteLoading />}>{element}</Suspense>;
}

function publicLanguageLoader(language: SupportedLanguage) {
  return async () => {
    if (i18n.resolvedLanguage !== language) await i18n.changeLanguage(language);
    return null;
  };
}

function PrivateAppRedirect() {
  const current = `${location.pathname}${location.search}${location.hash}`;
  const privatePath = location.pathname.startsWith("/app/")
    ? location.pathname.slice(4)
    : location.pathname;
  const target = appPath(`${privatePath}${location.search}${location.hash}`);

  useEffect(() => {
    if (target !== current) location.replace(target);
  }, [current, target]);

  return target === current ? <NotFoundPage /> : <RouteLoading />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    loader: publicLanguageLoader("es"),
    element: lazyRoute(<HomePage />),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/en/",
    loader: publicLanguageLoader("en"),
    element: lazyRoute(<HomePage />),
    errorElement: <RouteErrorBoundary />,
  },
  { path: "/about", loader: publicLanguageLoader("es"), element: lazyRoute(<AboutPage />) },
  { path: "/en/about", loader: publicLanguageLoader("en"), element: lazyRoute(<AboutPage />) },
  {
    path: "/pricing/",
    loader: publicLanguageLoader("es"),
    element: lazyRoute(<PricingPage />),
  },
  {
    path: "/en/pricing/",
    loader: publicLanguageLoader("en"),
    element: lazyRoute(<PricingPage />),
  },
  { path: "/docs", loader: publicLanguageLoader("es"), element: lazyRoute(<DocsPage />) },
  { path: "/en/docs", loader: publicLanguageLoader("en"), element: lazyRoute(<DocsPage />) },
  { path: "/support", loader: publicLanguageLoader("es"), element: lazyRoute(<SupportPage />) },
  { path: "/en/support", loader: publicLanguageLoader("en"), element: lazyRoute(<SupportPage />) },
  { path: "/privacy", loader: publicLanguageLoader("es"), element: lazyRoute(<PrivacyPage />) },
  { path: "/en/privacy", loader: publicLanguageLoader("en"), element: lazyRoute(<PrivacyPage />) },
  { path: "/terms", loader: publicLanguageLoader("es"), element: lazyRoute(<TermsPage />) },
  { path: "/en/terms", loader: publicLanguageLoader("en"), element: lazyRoute(<TermsPage />) },
  ...LEGACY_PRIVATE_PATHS.map((path) => ({
    path: `/${path}/*`,
    element: <PrivateAppRedirect />,
  })),
  { path: "/app/*", element: <PrivateAppRedirect /> },
  { path: "*", element: <NotFoundPage /> },
]);
