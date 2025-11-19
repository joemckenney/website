# syntax=docker/dockerfile:1

# Workspace pruner - creates a minimal workspace with only necessary dependencies
FROM node:24-alpine AS workspace-pruner

WORKDIR /app

# Install pnpm and turbo (pin pnpm version for cache stability)
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Set up pnpm global bin directory
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN pnpm add -g turbo

# Copy entire monorepo
COPY . .

# Prune workspace to only include @api/app and its dependencies
RUN turbo prune @api/app --docker

# Build stage - use Rust base image with Node added
FROM rust:1.83-alpine AS builder

WORKDIR /app

# Install Node.js, Go, and build dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    go \
    gcc \
    musl-dev

# Install pnpm globally
RUN npm install -g pnpm@9.15.4

# Install wasm32 target and wasm-pack (cache mounts avoid re-downloading)
RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/root/.cargo/git \
    rustup target add wasm32-unknown-unknown && \
    cargo install wasm-pack

# Copy workspace configs and lockfile from pruned output
COPY --from=workspace-pruner /app/out/json/ .
COPY --from=workspace-pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=workspace-pruner /app/out/pnpm-workspace.yaml* ./

# Install dependencies with cache mount for pnpm store
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source files from pruned output
COPY --from=workspace-pruner /app/out/full/ .

# Accept Turbo remote cache build arguments
ARG TURBO_TOKEN
ARG TURBO_TEAM
ENV TURBO_TOKEN=${TURBO_TOKEN}
ENV TURBO_TEAM=${TURBO_TEAM}

# Build using turbo (builds all dependencies including devDependencies)
RUN pnpm turbo build --filter=@api/app...

# Deploy stage - creates production deployment
FROM builder AS deployer

ENV NODE_ENV=production

# Deploy production-ready output to /app/pruned with only prod dependencies
# Modern pnpm deploy properly handles workspace dependencies and their files
RUN pnpm --filter=@api/app --prod deploy /app/pruned

# Production stage
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy the entire pruned deployment (includes app, workspace deps, node_modules)
COPY --from=deployer /app/pruned .

EXPOSE 3000

CMD ["node", "--experimental-wasm-modules", "dist/index.js"]
