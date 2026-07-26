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

RUN apk add --no-cache gettext \
    && rm -f /usr/share/nginx/html/index.html /usr/share/nginx/html/50x.html
COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY nginx.react.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint-react.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
