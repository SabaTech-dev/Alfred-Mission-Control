FROM node:22-slim

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# pnpm: el repo es pnpm-first (pnpm-lock.yaml + pnpm-workspace.yaml + CI con pnpm 9).
# El build anterior moría con "spawn pnpm ENOENT" al usar npm con scripts que invocan pnpm.
RUN npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/ ./scripts/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3001

EXPOSE 3001

CMD ["node", "node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3001"]
