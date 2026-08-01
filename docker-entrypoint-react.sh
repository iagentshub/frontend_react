#!/bin/sh
set -eu

: "${API_BASE:=}"
: "${BACKEND_URL:=http://backend:8765}"
: "${STRIPE_PUBLISHABLE_KEY:=}"

case "$BACKEND_URL" in
  http://*|https://*) ;;
  *) echo "BACKEND_URL debe empezar por http:// o https://" >&2; exit 1 ;;
esac
if printf '%s' "$BACKEND_URL" | grep -q '[[:space:];]'; then
  echo "BACKEND_URL contiene caracteres no permitidos" >&2
  exit 1
fi
BACKEND_URL="${BACKEND_URL%/}"
export BACKEND_URL

# Las comillas simples son deliberadas: envsubst recibe los nombres de las
# variables que debe sustituir sin que el shell las expanda antes.
# shellcheck disable=SC2016
envsubst '${API_BASE} ${STRIPE_PUBLISHABLE_KEY}' \
  < /usr/share/nginx/html/env.template.js \
  > /usr/share/nginx/html/env.js

# shellcheck disable=SC2016
envsubst '${BACKEND_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
