/// <reference types="vite/client" />

interface GaiaRuntimeConfig {
  API_BASE: string;
  STRIPE_PUBLISHABLE_KEY: string;
}

interface Window {
  __GAIA_CONFIG__?: GaiaRuntimeConfig;
}
