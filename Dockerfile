# =============================================================================
# Dockerfile — nm-frontend-v2 (Angular admin SPA + nginx)
# Build: docker build -t nm-admin .
# Run:   docker run -p 8080:80 nm-admin
# =============================================================================

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS builder
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npm run build -- --configuration=production && \
    OUT="dist/nm-frontend-v2/browser" && \
    if [ -f "$OUT/index.prod.html" ]; then mv "$OUT/index.prod.html" "$OUT/index.html"; fi

FROM nginx:1.27-alpine AS runner

COPY deploy/nginx.docker.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/nm-frontend-v2/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
