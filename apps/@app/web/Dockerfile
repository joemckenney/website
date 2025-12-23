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

# Prune workspace to only include @app/web and its dependencies
RUN turbo prune @app/web --docker

# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Enable corepack to use pnpm version from package.json
RUN corepack enable

# Copy workspace configs and lockfile from pruned output
COPY --from=workspace-pruner /app/out/json/ .
COPY --from=workspace-pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=workspace-pruner /app/out/pnpm-workspace.yaml* ./

# Accept build arguments
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

ARG TURBO_TOKEN
ARG TURBO_TEAM
ENV TURBO_TOKEN=${TURBO_TOKEN}
ENV TURBO_TEAM=${TURBO_TEAM}

# Install dependencies with cache mount for pnpm store
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source files from pruned output
COPY --from=workspace-pruner /app/out/full/ .

# Build using turbo (builds all dependencies including devDependencies)
RUN pnpm turbo build --filter=@app/web...

# Production stage - nginx to serve static files
FROM nginx:alpine

# Copy built static files (Vite output)
COPY --from=builder /app/apps/@app/web/dist /usr/share/nginx/html

# Copy nginx configuration (replace main config for non-root support)
COPY --from=builder /app/apps/@app/web/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
