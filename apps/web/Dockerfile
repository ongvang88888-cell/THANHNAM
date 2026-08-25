FROM node:20-bookworm-slim
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @edu/web build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@edu/web", "start"]
