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

# Prune workspace to only include @app/app and its dependencies
RUN turbo prune @app/app --docker

# Rust toolchain stage - install WASM build tools
FROM rust:1.83-alpine AS rust-toolchain

# Install build dependencies for Rust compilation
RUN apk add --no-cache gcc musl-dev

# Install wasm32 target and wasm-pack (cache mounts avoid re-downloading)
RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/root/.cargo/git \
    rustup target add wasm32-unknown-unknown && \
    cargo install wasm-pack

# Build stage - use Node base and copy Rust toolchain
FROM node:24-alpine AS builder

WORKDIR /app

# Copy Rust toolchain from dedicated stage
COPY --from=rust-toolchain /root/.cargo /root/.cargo
ENV PATH="/root/.cargo/bin:$PATH"

# Install Go, pnpm, and build dependencies
RUN apk add --no-cache go npm gcc musl-dev && \
    npm install -g pnpm@9.15.4

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
RUN pnpm turbo build --filter=@app/app...

# Production stage - nginx to serve static files
FROM nginx:alpine

# Copy built static files (Vite output)
COPY --from=builder /app/apps/@app/app/dist /usr/share/nginx/html

# Copy nginx configuration (replace main config for non-root support)
COPY --from=builder /app/apps/@app/app/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
