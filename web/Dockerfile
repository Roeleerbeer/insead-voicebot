# syntax=docker/dockerfile:1.7

# Build context is the REPO ROOT (see compose.prod.yml). That way the build
# can COPY both web/ and agent/content/ — page.tsx reads use-case.md etc.
# from ../agent/content/ at request time.

# --- deps -------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app/web
# better-sqlite3 + sharp build natively on first install; alpine needs these.
RUN apk add --no-cache python3 make g++
RUN corepack enable
COPY web/package.json web/pnpm-lock.yaml web/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- builder ----------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/web/node_modules ./web/node_modules
# Copy the web/ source and the agent/content/ markdown that the server reads.
COPY web ./web
COPY agent/content ./agent/content
WORKDIR /app/web
RUN pnpm build

# --- runtime ----------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app/web
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone output already includes a minimal node_modules; copy it plus
# the static assets and the agent/content/ markdown the server reads.
COPY --from=builder /app/web/.next/standalone /app
COPY --from=builder /app/web/.next/static ./.next/static
COPY --from=builder /app/web/public ./public
COPY --from=builder /app/agent/content /app/agent/content

EXPOSE 3000
CMD ["node", "server.js"]
