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

# Sin privilegios. Aquí no hace falta el baile de entrypoint+setpriv del
# backend, porque este contenedor no monta ningún volumen: no hay datos ajenos
# cuya propiedad haya que ceder al actualizar.
#
# El puerto SIGUE siendo el 80 a propósito. La alternativa habitual
# —nginx-unprivileged en el 8080— obligaría a cambiar el "${PORT}:80" de los
# tres composes y, peor, el de cualquiera que tenga el suyo propio: se
# quedarían sin frontend al actualizar. No hace falta, porque Docker arranca los
# contenedores con net.ipv4.ip_unprivileged_port_start=0 y un usuario normal
# puede atar al 80. Si algún día se despliega en un runtime que no lo haga,
# nginx fallará al arrancar con "permission denied" en el bind, que es ruidoso
# y evidente — no un fallo silencioso.
#
# Lo que se escribe en cada arranque: la caché de nginx, el pid, sus logs, el
# default.conf que genera envsubst y el env.js con la config del cliente.
#
# env.js se pre-crea para poder cedérselo suelto: dar /usr/share/nginx/html
# entero dejaría el sitio estático escribible por el proceso que lo sirve, que
# es justo lo que no interesa. Así el resto sigue siendo de solo lectura.
RUN touch /var/run/nginx.pid /usr/share/nginx/html/env.js \
    && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
    && chown nginx:nginx /var/run/nginx.pid /usr/share/nginx/html/env.js
USER nginx

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
