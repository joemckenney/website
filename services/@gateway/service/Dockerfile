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

# Prune workspace to only include @gateway/service and its dependencies
RUN turbo prune @gateway/service --docker

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
RUN pnpm turbo build --filter=@gateway/service...

# Deploy stage - creates production deployment
FROM builder AS deployer

ENV NODE_ENV=production

# Deploy production-ready output to /app/pruned with only prod dependencies
# Modern pnpm deploy properly handles workspace dependencies and their files
RUN pnpm --filter=@gateway/service --prod deploy /app/pruned

# Production stage
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy the entire pruned deployment (includes app, workspace deps, node_modules)
COPY --from=deployer /app/pruned .

# Fix permissions for non-root user (pnpm deploy creates some files with 600 permissions)
RUN chmod -R a+r /app

EXPOSE 3000

CMD ["node", "dist/index.js"]
