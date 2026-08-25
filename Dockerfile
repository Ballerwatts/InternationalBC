# Multi-stage build producing a small, self-contained Next.js server.
# Requires Node 22.5+ (node:sqlite). Designed for Fly.io (see fly.toml) but
# works on any Docker host with a persistent volume mounted at /data.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Dummy build-time env — the real SESSION_SECRET/etc. are supplied at deploy
# time; the build itself never touches the database or sends network requests.
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/ibc.db
ENV PORT=3000

# Stamped by the deploy command so /api/version reports the truth:
#   fly deploy --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
#              --build-arg BUILT_AT=$(date -u +%Y-%m-%dT%H:%MZ)
# Defaults to "unknown" rather than a stale value — an honest gap beats a
# confident lie about what is running.
ARG GIT_COMMIT=unknown
ARG BUILT_AT=unknown
ENV APP_COMMIT=$GIT_COMMIT
ENV APP_BUILT=$BUILT_AT

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Where the persistent volume mounts — created here so the app can write to
# it even before the volume is attached (e.g. first local `docker run`).
RUN mkdir -p /data

EXPOSE 3000
CMD ["node", "server.js"]
