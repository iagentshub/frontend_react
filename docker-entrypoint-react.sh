#!/bin/sh
set -eu

: "${API_BASE:=}"
: "${STRIPE_PUBLISHABLE_KEY:=}"

envsubst '${API_BASE} ${STRIPE_PUBLISHABLE_KEY}' \
  < /usr/share/nginx/html/env.template.js \
  > /usr/share/nginx/html/env.js

exec nginx -g 'daemon off;'
