# syntax=docker/dockerfile:1

FROM node:24-alpine AS workspace-pruner

WORKDIR /app

RUN corepack enable

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN pnpm add -g turbo

COPY . .

RUN turbo prune @ai/service --docker

FROM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY --from=workspace-pruner /app/out/json/ .
COPY --from=workspace-pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=workspace-pruner /app/out/pnpm-workspace.yaml* ./

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install

COPY --from=workspace-pruner /app/out/full/ .

RUN pnpm turbo build --filter=@ai/service...

FROM builder AS deployer

ENV NODE_ENV=production

RUN pnpm --filter=@ai/service --prod deploy /app/pruned

FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deployer --chown=1000:1000 /app/pruned .

EXPOSE 3006

CMD ["node", "--import", "@website/tracing/register", "dist/index.js"]
