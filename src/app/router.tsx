/* eslint-disable react-refresh/only-export-components -- route modules intentionally compose lazy components */
import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "@/auth/guards";
import { AppShell } from "@/layout/app-shell";
import { NotFoundPage, RouteErrorBoundary, RouteLoading } from "@/routes/shared/status-pages";

const LoginPage = lazy(() => import("@/routes/auth/login-page").then((module) => ({ default: module.LoginPage })));
const HomePage = lazy(() => import("@/routes/public/home-page").then((module) => ({ default: module.HomePage })));
const ForgotPasswordPage = lazy(() => import("@/routes/auth/forgot-password-page").then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/routes/auth/reset-password-page").then((module) => ({ default: module.ResetPasswordPage })));
const VerifyPage = lazy(() => import("@/routes/auth/verify-page").then((module) => ({ default: module.VerifyPage })));
const AboutPage = lazy(() => import("@/routes/public/about-page").then((module) => ({ default: module.AboutPage })));
const DocsPage = lazy(() => import("@/routes/public/docs-page").then((module) => ({ default: module.DocsPage })));
const DashboardPage = lazy(() => import("@/routes/dashboard/dashboard-page").then((module) => ({ default: module.DashboardPage })));
const AgentsPage = lazy(() => import("@/routes/agents/agents-page").then((module) => ({ default: module.AgentsPage })));
const RegisterPage = lazy(() => import("@/routes/auth/register-page").then((module) => ({ default: module.RegisterPage })));
const PricingPage = lazy(() => import("@/routes/public/pricing-page").then((module) => ({ default: module.PricingPage })));
const CheckoutPage = lazy(() => import("@/routes/public/checkout-page").then((module) => ({ default: module.CheckoutPage })));
const PublicProfilePage = lazy(() => import("@/routes/public/public-profile-page").then((module) => ({ default: module.PublicProfilePage })));
const ConnectionsPage = lazy(() => import("@/routes/connections/connections-page").then((module) => ({ default: module.ConnectionsPage })));
const MemoryPage = lazy(() => import("@/routes/memory/memory-page").then((module) => ({ default: module.MemoryPage })));
const KnowledgePage = lazy(() => import("@/routes/knowledge/knowledge-page").then((module) => ({ default: module.KnowledgePage })));
const ExplorePage = lazy(() => import("@/routes/explore/explore-page").then((module) => ({ default: module.ExplorePage })));
const LabelsPage = lazy(() => import("@/routes/labels/labels-page").then((module) => ({ default: module.LabelsPage })));
const ManagerPage = lazy(() => import("@/routes/manager/manager-page").then((module) => ({ default: module.ManagerPage })));
const ProfilePage = lazy(() => import("@/routes/profile/profile-page").then((module) => ({ default: module.ProfilePage })));
const AdminPage = lazy(() => import("@/routes/admin/admin-page").then((module) => ({ default: module.AdminPage })));
const MetadataPage = lazy(() => import("@/routes/admin/metadata-page").then((module) => ({ default: module.MetadataPage })));
const CentinelPage = lazy(() => import("@/routes/admin/centinel-page").then((module) => ({ default: module.CentinelPage })));

function lazyRoute(element: ReactNode) {
  return <Suspense fallback={<RouteLoading />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/", element: lazyRoute(<HomePage />), errorElement: <RouteErrorBoundary /> },
  { path: "/login", element: <Navigate to="/login/" replace /> },
  { path: "/login/", element: lazyRoute(<LoginPage />) },
  {
    path: "/dashboard/",
    element: <RequireAuth><AppShell /></RequireAuth>,
    children: [{ index: true, element: lazyRoute(<DashboardPage />) }],
  },
  {
    path: "/agents/",
    element: <RequireAuth><AppShell /></RequireAuth>,
    children: [{ index: true, element: lazyRoute(<AgentsPage />) }],
  },
  {
    path: "/connections/",
    element: <RequireAuth><AppShell /></RequireAuth>,
    children: [{ index: true, element: lazyRoute(<ConnectionsPage />) }],
  },
  {
    path: "/memory/",
    element: <RequireAuth><AppShell /></RequireAuth>,
    children: [{ index: true, element: lazyRoute(<MemoryPage />) }],
  },
  {
    path: "/knowledge/", element: <RequireAuth><AppShell /></RequireAuth>,
    children: [{ index: true, element: lazyRoute(<KnowledgePage />) }],
  },
  {
    path: "/explore/", element: <RequireAuth><AppShell /></RequireAuth>,
    children: [{ index: true, element: lazyRoute(<ExplorePage />) }],
  },
  {
    path: "/labels/", element: <RequireAuth><AppShell /></RequireAuth>,
    children: [{ index: true, element: lazyRoute(<LabelsPage />) }],
  },
  {
    path: "/manager/", element: <RequireAuth><AppShell /></RequireAuth>,
    children: [{ index: true, element: lazyRoute(<ManagerPage />) }],
  },
  {
    path: "/profile/", element: <RequireAuth><AppShell /></RequireAuth>,
    children: [{ index: true, element: lazyRoute(<ProfilePage />) }],
  },
  {
    path: "/admin/",
    element: <RequireAuth role="admin"><AppShell /></RequireAuth>,
    children: [{ index: true, element: lazyRoute(<AdminPage />) }],
  },
  {
    path: "/admin/metadata/",
    element: <RequireAuth role="admin"><AppShell /></RequireAuth>,
    children: [{ index: true, element: lazyRoute(<MetadataPage />) }],
  },
  {
    path: "/admin/centinel/",
    element: <RequireAuth role="admin"><AppShell /></RequireAuth>,
    children: [{ index: true, element: lazyRoute(<CentinelPage />) }],
  },
  { path: "/about", element: lazyRoute(<AboutPage />) },
  { path: "/pricing/", element: lazyRoute(<PricingPage />) },
  { path: "/docs", element: lazyRoute(<DocsPage />) },
  { path: "/register/", element: lazyRoute(<RegisterPage />) },
  { path: "/verify/", element: lazyRoute(<VerifyPage />) },
  { path: "/forgot-password/", element: lazyRoute(<ForgotPasswordPage />) },
  { path: "/reset-password/", element: lazyRoute(<ResetPasswordPage />) },
  { path: "/checkout/", element: lazyRoute(<CheckoutPage />) },
  { path: "/u/:username", element: <RequireAuth><AppShell /></RequireAuth>, children: [{ index: true, element: lazyRoute(<PublicProfilePage />) }] },
  { path: "*", element: <NotFoundPage /> },
]);
