# Built by CI from the repo root (see .github/workflows/deploy.yml) and pulled
# by the server by digest. Nothing is built on the server.

# ── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /repo

# Prisma picks its engine by the OpenSSL it finds. Both stages must have the
# same one, or the runner looks for an engine that was never fetched and tries
# to download it at start-up — which the deploy's migration gate reads as a
# failure.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace backend --include-workspace-root=false

COPY backend/ backend/
WORKDIR /repo/backend
RUN npx prisma generate && npx tsc
# Leave only what runs. The Prisma CLI stays: it is a dependency, not a dev
# one, because the entrypoint and the deploy's migration gate both run it.
WORKDIR /repo
RUN npm prune --omit=dev --workspace backend --include-workspace-root=false

# ── Stage 2: Production runner ──────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

# Prisma's query engine needs OpenSSL, which the slim image leaves out.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# The deploy's migration gate runs `./node_modules/.bin/prisma migrate status`
# and reads `prisma/migrations/<name>/migration.sql` from this directory, so
# the Prisma CLI and the migrations must both be here.
COPY --from=builder --chown=node:node /repo/node_modules ./node_modules
COPY --from=builder --chown=node:node /repo/backend/dist ./dist
COPY --from=builder --chown=node:node /repo/backend/prisma ./prisma
COPY --chown=node:node backend/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3001

COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
USER node
ENTRYPOINT ["/entrypoint.sh"]
