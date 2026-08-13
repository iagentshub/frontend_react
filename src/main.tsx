import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { App } from "@/app/app";
import { queryClient } from "@/api/query-client";
import i18n from "@/i18n";
import { installChunkRecovery } from "@/app/chunk-recovery";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "../assets/css/variables.css";
import "../assets/themes/themes.css";
import "../assets/css/base.css";
import "../assets/css/components.css";
import "./styles/react.css";

const root = document.getElementById("root");
if (!root) throw new Error("No se encontró #root");

// Debe instalarse antes de renderizar: cualquier ruta lazy puede descubrir un
// chunk obsoleto durante su primer render después de un despliegue.
installChunkRecovery();

createRoot(root).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </I18nextProvider>
  </StrictMode>,
);
