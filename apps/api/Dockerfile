FROM node:20-bookworm-slim
WORKDIR /repo
RUN corepack enable \
  && apt-get update -qq \
  && apt-get install -y -qq openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile-student/package.json ./apps/mobile-student/package.json
COPY apps/workers/package.json ./apps/workers/package.json

RUN pnpm install --frozen-lockfile
RUN pnpm db:generate && pnpm --filter @edu/api build \
  && chmod +x apps/api/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3001
ENTRYPOINT ["/repo/apps/api/docker-entrypoint.sh"]
