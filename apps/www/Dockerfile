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

# Prune workspace to only include @app/www and its dependencies
RUN turbo prune @app/www --docker

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

# Accept build arguments
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

ARG VITE_PUBLIC_POSTHOG_KEY
ENV VITE_PUBLIC_POSTHOG_KEY=${VITE_PUBLIC_POSTHOG_KEY}

ARG VITE_PUBLIC_POSTHOG_HOST
ENV VITE_PUBLIC_POSTHOG_HOST=${VITE_PUBLIC_POSTHOG_HOST}

ARG TURBO_TOKEN
ARG TURBO_TEAM
ENV TURBO_TOKEN=${TURBO_TOKEN}
ENV TURBO_TEAM=${TURBO_TEAM}

# Build using turbo (builds all dependencies including devDependencies)
RUN pnpm turbo build --filter=@app/www...

# Production stage - nginx to serve static files
FROM nginx:alpine

# Copy built static files (Vite output)
COPY --from=builder /app/apps/www/dist /usr/share/nginx/html

# Copy nginx configuration (replace main config for non-root support)
COPY --from=builder /app/apps/www/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
