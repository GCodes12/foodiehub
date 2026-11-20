# ZAYORA web app image (Phase 3). Serves the Vite build that already exists in dist/ (npm run build or the Jenkins
# pipeline); nothing is compiled here.
#   docker build -t zayora/frontend frontend
#
# VITE_* settings (Keycloak URL, realm, client id, restaurant id) are fixed when dist/ is built, not here.
# At runtime only the API gateway address is configured: GATEWAY_URL (default http://api-gateway:8090). The gateway
# host must be resolvable when the container starts.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine

# The image's entrypoint renders /etc/nginx/templates/*.template into /etc/nginx/conf.d/ with environment variables.
ENV GATEWAY_URL=http://api-gateway:8090
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY dist/ /usr/share/nginx/html/

# nginx-unprivileged runs as the non-root user nginx (uid 101) and listens on 8080.
EXPOSE 8080
