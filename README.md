# iAgentsHub Frontend

Single-page application built with React 19, TypeScript and Vite. It preserves the public and authenticated URLs of the previous static frontend while sharing navigation, session state, themes and translations in one React application.

## Local development

```bash
npm ci
npm run dev
```

The development server proxies `/api/` to the backend configured in `vite.config.ts`. Runtime deployments can set `API_BASE` and `STRIPE_PUBLISHABLE_KEY`; the container writes them to `/env.js` at startup.

## Verification

```bash
npm run check
npx playwright install chromium
npm run test:e2e:chromium
```

`npm run check` runs TypeScript, ESLint, Vitest and a production build. Playwright covers the public flows, every authenticated route, accessibility and visual references for Spanish/English and dark/light themes.

## Production

```bash
docker build -t iagentshub-frontend .
docker run -p 80:80 iagentshub-frontend
```

Nginx serves the Vite build with an HTML5-history fallback and proxies `/api/` to `backend:8765`.
