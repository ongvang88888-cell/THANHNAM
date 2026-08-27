FROM node:20-bookworm-slim
WORKDIR /repo
RUN corepack enable \
  && apt-get update -qq \
  && apt-get install -y -qq openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1
ARG NEXT_PUBLIC_APP_ID=education_app
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_ID=$NEXT_PUBLIC_APP_ID
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/api/package.json ./apps/api/package.json
COPY apps/mobile-student/package.json ./apps/mobile-student/package.json
COPY apps/workers/package.json ./apps/workers/package.json

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @edu/shared-core build \
  && pnpm --filter @edu/education-core build \
  && pnpm --filter @edu/media-core build \
  && pnpm --filter @edu/monetization-core build \
  && pnpm --filter @edu/database build \
  && pnpm db:generate \
  && pnpm --filter @edu/web build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@edu/web", "start"]
