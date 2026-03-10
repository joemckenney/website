# syntax=docker/dockerfile:1

# Workspace pruner - creates a minimal workspace with only necessary dependencies
FROM node:24-alpine AS workspace-pruner

WORKDIR /app

# Enable corepack to use pnpm version from package.json
RUN corepack enable

# Set up pnpm global bin directory
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN pnpm add -g turbo

# Copy entire monorepo
COPY . .

# Prune workspace to only include @weather/service and its dependencies
RUN turbo prune @weather/service --docker

# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Enable corepack to use pnpm version from package.json
RUN corepack enable

# Install build tools for native modules (better-sqlite3 peer dep of prisma)
RUN apk add --no-cache python3 make g++

# Copy workspace configs and lockfile from pruned output
COPY --from=workspace-pruner /app/out/json/ .
COPY --from=workspace-pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=workspace-pruner /app/out/pnpm-workspace.yaml* ./

# Install dependencies with cache mount for pnpm store
# Note: --no-frozen-lockfile needed because turbo prune generates incomplete lockfiles for pnpm v9+
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install

# Copy source files from pruned output
COPY --from=workspace-pruner /app/out/full/ .

# Build using turbo (no remote cache - Docker layer cache is sufficient)
RUN pnpm turbo build --filter=@weather/service...

# Deploy stage - creates production deployment
FROM builder AS deployer

ENV NODE_ENV=production

# Deploy production-ready output to /app/pruned with only prod dependencies
RUN pnpm --filter=@weather/service --prod deploy /app/pruned

# Migration stage - runs from builder which has prisma CLI properly installed
# Used by Helm pre-upgrade hooks before the main deployment
FROM builder AS migrator

WORKDIR /app/services/@weather/db

CMD ["npx", "prisma", "migrate", "deploy"]

# Production stage
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy the entire pruned deployment (includes app, workspace deps, node_modules)
COPY --from=deployer --chown=1000:1000 /app/pruned .

EXPOSE 3004

CMD ["node", "--import", "@website/tracing/register", "dist/index.js"]
