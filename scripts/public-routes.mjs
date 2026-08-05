/**
 * Única lista de páginas que pueden indexarse.
 *
 * El prerender, el sitemap y las comprobaciones de CI consumen este manifiesto
 * para que nunca publiquemos una URL que no exista o dejemos una página pública
 * sin canonical/hreflang. No añadir aquí rutas privadas ni páginas de campaña.
 */
export const publicPagePairs = [
  {
    key: "home",
    es: "/",
    en: "/en/",
    sources: {
      es: ["src/routes/public/home-page.tsx", "assets/locales/es/landing.json", "assets/locales/es/seo.json"],
      en: ["src/routes/public/home-page.tsx", "assets/locales/en/landing.json", "assets/locales/en/seo.json"],
    },
  },
  {
    key: "about",
    es: "/about",
    en: "/en/about",
    sources: {
      es: ["src/routes/public/about-page.tsx", "assets/locales/es/about.json", "assets/locales/es/seo.json"],
      en: ["src/routes/public/about-page.tsx", "assets/locales/en/about.json", "assets/locales/en/seo.json"],
    },
  },
  {
    key: "pricing",
    es: "/pricing/",
    en: "/en/pricing/",
    sources: {
      es: ["src/routes/public/pricing-page.tsx", "assets/locales/es/pricing.json", "assets/locales/es/seo.json"],
      en: ["src/routes/public/pricing-page.tsx", "assets/locales/en/pricing.json", "assets/locales/en/seo.json"],
    },
  },
  {
    key: "docs",
    es: "/docs",
    en: "/en/docs",
    sources: {
      es: ["src/routes/public/docs-page.tsx", "assets/locales/es/docs.json", "assets/locales/es/seo.json"],
      en: ["src/routes/public/docs-page.tsx", "assets/locales/en/docs.json", "assets/locales/en/seo.json"],
    },
  },
  {
    key: "support",
    es: "/support",
    en: "/en/support",
    sources: {
      es: ["src/routes/public/support-page.tsx", "assets/locales/es/support.json", "assets/locales/es/seo.json"],
      en: ["src/routes/public/support-page.tsx", "assets/locales/en/support.json", "assets/locales/en/seo.json"],
    },
  },
  {
    key: "privacy",
    es: "/privacy",
    en: "/en/privacy",
    sources: {
      es: ["src/routes/public/legal-page.tsx", "assets/locales/es/legal.json", "assets/locales/es/seo.json"],
      en: ["src/routes/public/legal-page.tsx", "assets/locales/en/legal.json", "assets/locales/en/seo.json"],
    },
  },
  {
    key: "terms",
    es: "/terms",
    en: "/en/terms",
    sources: {
      es: ["src/routes/public/legal-page.tsx", "assets/locales/es/legal.json", "assets/locales/es/seo.json"],
      en: ["src/routes/public/legal-page.tsx", "assets/locales/en/legal.json", "assets/locales/en/seo.json"],
    },
  },
];

/** Una entrada por URL, en el mismo orden estable que usa el sitemap. */
export const publicRoutes = publicPagePairs.flatMap((pair) => [
  { path: pair.es, language: "es", alternates: { es: pair.es, en: pair.en } },
  { path: pair.en, language: "en", alternates: { es: pair.es, en: pair.en } },
]);
