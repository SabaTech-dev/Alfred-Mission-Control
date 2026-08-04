# syntax=docker/dockerfile:1
#
# Alfred Mission Control — production image (single-stage)
#
# Build:  docker build -t amc .
# Run:    docker run --rm -p 3001:3001 -e JWT_SECRET=... -e ADMIN_PASSWORD=... amc

FROM node:22-slim

# Build toolchain for native modules (e.g. better-sqlite3 if added later).
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Disable git hooks (no .git in image) and Next.js telemetry during build.
ENV HUSKY=0
ENV NEXT_TELEMETRY_DISABLED=1
# Puppeteer (devDep) and Playwright download full browsers on `npm install`.
# The prod runtime uses puppeteer-core with an external Chrome, so skip the
# ~1 GB browser download — it is not needed inside the image.
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Create the runtime user up front and run install/build as that user. This way
# the generated files are already owned by nextjs, avoiding a multi-GB `chown -R`
# layer that would otherwise duplicate the entire /app tree.
RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs --create-home nextjs \
 && chown nextjs:nodejs /app
USER nextjs

# --- Dependencies (cached layer) ---
# scripts/ must be present before install: the postinstall hook runs
# scripts/fix-react-exports.sh (React 19 + Vitest 4 export patch).
COPY --chown=nextjs:nodejs package.json package-lock.json ./
COPY --chown=nextjs:nodejs scripts/ ./scripts/
RUN npm install

# --- Application source ---
# .dockerignore keeps node_modules/.next/.git/.env*/pnpm-lock.yaml out of the
# context, so this COPY no longer collides with the installed node_modules and
# Next.js detects npm (not pnpm) as the package manager.
COPY --chown=nextjs:nodejs . .

# jwt-utils.ts calls loadKeys() at module-import time and throws unless
# JWT_SECRET (>=32 chars) is set. Next.js evaluates every route module while
# collecting page data, so the build needs a placeholder here. It is scoped to
# THIS RUN only — NOT persisted as ENV — so the real secret MUST be supplied at
# runtime (e.g. `docker run -e JWT_SECRET=...`).
RUN JWT_SECRET="docker-build-placeholder-not-a-real-secret-do-not-use-123456" \
    npm run build

# --- Runtime ---
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3001

EXPOSE 3001

# Lightweight liveness probe: /api/health returns 200 once Next.js is serving
# (it reports "degraded" when backing services are unreachable, but still 200).
HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["node", "node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3001"]
