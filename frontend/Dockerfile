# Built by CI from the repo root (see .github/workflows/deploy.yml) and pulled
# by the server by digest.

# ── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /repo

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN npm ci --workspace frontend --include-workspace-root=false

COPY frontend/ frontend/
WORKDIR /repo/frontend
RUN npm run build

# ── Stage 2: nginx static server ────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner
COPY --from=builder /repo/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
EXPOSE 80
