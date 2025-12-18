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

# Prune workspace to only include @user/service and its dependencies
RUN turbo prune @user/service --docker

# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install Go, pnpm, and build dependencies (needed for Prisma native binaries)
RUN apk add --no-cache go npm openssl && \
    npm install -g pnpm@9.15.4

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

# Build using turbo (generates Prisma Client and builds TypeScript)
RUN pnpm turbo build --filter=@user/service...

# Deploy stage - creates production deployment
FROM builder AS deployer

ENV NODE_ENV=production

# Deploy production-ready output to /app/pruned with only prod dependencies
# This includes Prisma Client which is a dependency
RUN pnpm --filter=@user/service --prod deploy /app/pruned

# Production stage
FROM node:24-alpine

WORKDIR /app

# Install openssl (required by Prisma) and pnpm (for migrations)
RUN apk add --no-cache openssl npm && \
    npm install -g pnpm@9.15.4

ENV NODE_ENV=production

# Copy the entire pruned deployment (includes app, workspace deps including @user/orm with Prisma)
COPY --from=deployer /app/pruned .

# Generate Prisma Client in the deployed node_modules
RUN cd node_modules/@user/orm && pnpm prisma generate

# Fix permissions for Kubernetes non-root users
RUN chmod -R a+r /app && find /app -type d -exec chmod a+x {} \;

EXPOSE 3002

CMD ["node", "dist/index.js"]
