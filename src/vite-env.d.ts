/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRIVATE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GaiaRuntimeConfig {
  API_BASE: string;
  STRIPE_PUBLISHABLE_KEY: string;
}

interface Window {
  __GAIA_CONFIG__?: GaiaRuntimeConfig;
}
