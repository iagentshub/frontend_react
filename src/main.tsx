import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { App } from "@/app/app";
import { queryClient } from "@/api/query-client";
import i18n from "@/i18n";
import { ThemeProvider } from "@/theme/theme-context";
import "../assets/css/variables.css";
import "../assets/themes/themes.css";
import "../assets/css/base.css";
import "../assets/css/components.css";
import "../assets/css/layout.css";
import "../assets/css/animations.css";
import "../assets/css/modals.css";
import "../assets/components/main_nav/main_nav.css";
import "./styles/react.css";

const root = document.getElementById("root");
if (!root) throw new Error("No se encontró #root");

createRoot(root).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider><App /></ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>
  </StrictMode>,
);
