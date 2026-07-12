FROM mcr.microsoft.com/playwright:v1.61.1-noble AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run prerender

FROM nginx:1.27-alpine
RUN apk add --no-cache gettext \
    && rm -f /usr/share/nginx/html/index.html /usr/share/nginx/html/50x.html
COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY nginx.react.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint-react.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
