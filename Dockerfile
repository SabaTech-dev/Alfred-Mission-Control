FROM node:22-slim

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# pnpm via corepack: the exact version is resolved from the packageManager
# field in package.json (single source of truth, pinned in PR #12). Replaces
# the floating `npm install -g pnpm@9`, which drifted from the repo pin.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Fail fast if the corepack-resolved pnpm drifts from the pinned packageManager.
RUN pnpm --version

COPY scripts/ ./scripts/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3001

EXPOSE 3001

# node_modules/.bin/next is a POSIX shell shim (pnpm layout) and cannot be run
# with `node`; invoke Next's real JS entrypoint instead.
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3001"]
