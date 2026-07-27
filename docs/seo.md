# SEO de iAgents Hub

El SEO público se limita deliberadamente a cinco páginas por idioma:

- `/` y `/en/`
- `/about` y `/en/about`
- `/pricing/` y `/en/pricing/`
- `/docs` y `/en/docs`
- `/support` y `/en/support`

No deben añadirse rutas privadas, perfiles, login ni páginas generadas para
palabras clave al sitemap.

## Cómo funciona

1. `scripts/public-routes.mjs` es el manifiesto único de URLs indexables.
2. `npm run sitemap` genera `public/sitemap.xml`, incluyendo `hreflang` y la
   fecha del último commit que modificó el contenido de cada idioma.
3. `npm run prerender` crea HTML completo para las diez URLs y `404.html`.
4. `<Seo>` fija title, description, canonical, robots, Open Graph y Twitter.
5. Nginx redirige variantes no canónicas, sirve las rutas privadas con el shell
   SPA y responde 404 real para una URL desconocida.
6. `npm run seo:verify` inspecciona el resultado de producción y falla si una
   página pierde sus metadatos, idioma, `hreflang`, `<h1>` o JSON-LD.
7. Playwright vuelve a comprobar las diez páginas en un navegador real.

## Publicación y Search Console

Después de publicar:

1. Abrir Google Search Console y añadir una propiedad de dominio para
   `iagentshub.com`. Google solicitará un registro DNS; debe crearlo quien
   administre el dominio.
2. En **Sitemaps**, enviar `https://www.iagentshub.com/sitemap.xml`.
3. Inspeccionar `/`, `/en/`, `/docs` y `/en/docs` y solicitar indexación una
   sola vez después del primer despliegue.
4. Revisar semanalmente **Indexación de páginas** y **Core Web Vitals**.
5. No usar la retirada de URL para errores normales: una página eliminada debe
   responder 404 o redirigir 301 a su sustituta real.

## Comprobación local

```bash
npm run check
npm run test:e2e:chromium
```

La respuesta HTTP 404 depende de Nginx; el preview de Vite solo comprueba la
pantalla y su `noindex`. La imagen Docker debe validarse además con:

```bash
curl -I http://localhost:PUERTO/esta-ruta-no-existe
```

El resultado esperado es `404 Not Found` y
`X-Robots-Tag: noindex, nofollow`.
