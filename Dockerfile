FROM --platform=$BUILDPLATFORM mcr.microsoft.com/playwright:v1.61.1-noble AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run prerender

FROM nginx:1.27-alpine

# Versión de build (formato YYYYMMDDHHMMSS, UTC) — la inyecta el workflow de
# CI vía --build-arg. "dev" en builds locales sin el arg.
ARG GAIA_VERSION=dev
ENV GAIA_VERSION=$GAIA_VERSION
LABEL org.iagentshub.version=$GAIA_VERSION
LABEL org.opencontainers.image.source="https://github.com/iagentshub/frontend_react"

RUN apk add --no-cache gettext \
    && rm -f /usr/share/nginx/html/index.html /usr/share/nginx/html/50x.html
COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY flutter-web/ /usr/share/nginx/html/app/
COPY nginx.react.conf /etc/nginx/templates/default.conf.template
COPY docker-entrypoint-react.sh /docker-entrypoint.sh
# Un checkout con core.autocrlf no debe producir una imagen que Linux no pueda
# ejecutar. La normalización es inocua cuando el fichero ya llega con LF.
RUN sed -i 's/\r$//' /docker-entrypoint.sh \
    && chmod +x /docker-entrypoint.sh

# Sin privilegios, pero manteniendo el puerto 80 a propósito: cambiarlo rompería
# el compose de cualquiera que ya tenga la aplicación instalada. env.js se
# pre-crea para cedérselo suelto y que el resto del sitio siga siendo de solo
# lectura. Ver docs/adr/001-nginx-sin-privilegios-en-el-puerto-80.md
RUN touch /var/run/nginx.pid /usr/share/nginx/html/env.js \
    && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
    && chown nginx:nginx /var/run/nginx.pid /usr/share/nginx/html/env.js
USER nginx

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
