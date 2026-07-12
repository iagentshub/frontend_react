const defaults: GaiaRuntimeConfig = {
  API_BASE: "",
  STRIPE_PUBLISHABLE_KEY: "",
};

export const runtimeConfig: Readonly<GaiaRuntimeConfig> = Object.freeze({
  ...defaults,
  ...window.__GAIA_CONFIG__,
});
