# iAgentsHub Frontend

Public, SEO-oriented frontend built with React 19, TypeScript and Vite.

Production has one domain and three clearly separated areas:

- React serves the ten indexable public URLs such as `/`, `/about`, `/pricing/`, `/docs` and `/support`.
- Flutter Web serves the private product under `/app/`.
- FastAPI remains available under `/api/`.

Legacy private URLs such as `/login/` and `/dashboard/` redirect permanently to their `/app/...` equivalents.

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

`npm run check` runs TypeScript, ESLint, Vitest, prerendering and the SEO build verification. Playwright covers the public routes and their Spanish/English visual references. Flutter owns and tests the authenticated routes.

## Production

The production image expects the Flutter build in `flutter-web/`:

```bash
cd ../app_flutter
flutter build web --release --base-href /app/
cd ../frontend_react
cp -r ../app_flutter/build/web flutter-web
docker build -t frontend .
docker run -p 80:80 frontend
```

CI performs these steps automatically. Nginx serves only existing/prerendered React pages, falls back to Flutter's SPA shell under `/app/`, redirects old private routes, and proxies `/api/` to `backend:8765`.
