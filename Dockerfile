# Production image: Next.js standalone server (site, /panel, /kabinet, APIs).
# Needs `output: 'standalone'` in next.config.ts (otherwise .next/standalone is
# never created and the COPY in the runner stage fails).

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat && corepack enable pnpm
WORKDIR /app

# Dependencies: cached until package.json or the lockfile change.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Inlined into the client bundle at build time, so it is a build arg, not runtime env.
ARG NEXT_PUBLIC_SERVER_URL=https://hlyna.com.ua
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL \
    NEXT_TELEMETRY_DISABLED=1
# Pages are pre-rendered from the live database, so the image ships complete HTML. deploy/push.sh passes the
# db container's address as a build secret (compose.yaml: build_database_url); it is never stored in a layer.
# The build fails if it sees an empty catalogue (src/lib/catalog.ts, MIN_BUILD_STUDIOS).
RUN --mount=type=secret,id=build_database_url,required=true \
    DATABASE_URL="$(cat /run/secrets/build_database_url)" pnpm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Fonts for generated share cards (/og) are read from disk at runtime.
COPY --from=builder /app/src/assets ./src/assets
# Uploaded photos live in public/media; compose mounts the media volume there (Caddy serves /media/*).
RUN mkdir -p public/media && chown -R nextjs:nodejs public/media .next
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
