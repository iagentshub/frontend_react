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
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
