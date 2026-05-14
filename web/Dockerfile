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
COPY web/package.json web/pnpm-lock.yaml web/pnpm-workspace.yaml web/.npmrc ./
# pnpm 11 blocks native post-install scripts by default and the allowlist
# configs don't reliably work in CI/container. Install without scripts, then
# rebuild the one native dep we actually need.
RUN pnpm install --frozen-lockfile --ignore-scripts \
 && pnpm rebuild better-sqlite3

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
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    AGENT_CONTENT_DIR=/app/agent/content

# Standalone output: server.js + minimal node_modules at the standalone root,
# static/public next to .next/, markdown next to the app.
COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder /app/web/.next/static ./.next/static
COPY --from=builder /app/web/public ./public
COPY --from=builder /app/agent/content ./agent/content

EXPOSE 3000
CMD ["node", "server.js"]
