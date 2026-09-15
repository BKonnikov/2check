# syntax=docker/dockerfile:1

# PRD 27.3 — one immutable artifact is promoted between environments; every difference between
# them comes from configuration and secrets, never from a rebuild.
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @2check/api... build
# pnpm deploy produces a self-contained tree with production dependencies only.
RUN pnpm deploy --filter @2check/api --prod --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
# The service runs unprivileged; node:alpine already ships the "node" user.
USER node
WORKDIR /app
COPY --from=build --chown=node:node /out /app
COPY --from=build --chown=node:node /repo/apps/api/migrations /app/migrations
EXPOSE 3001
# PRD 27.5 — readiness is what gates traffic; the container only reports liveness here.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3001)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
