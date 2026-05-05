# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A TypeScript monorepo with type-safe API generation, Kubernetes deployment, and observability. Self-hosted on k3s (rookery VM) with FluxCD GitOps and Cloudflare Tunnel ingress.

## Repository Structure

```
apps/
  www/                - Crowprose homepage (SSG): blog, projects, contributions
  dashboard/          - React + Vite chat client (multi-provider)

services/
  @gateway/
    service/          - Fastify API gateway: OAuth, JWT auth, proxy to @ai and @users
    sdk/              - Auto-generated TypeScript client from OpenAPI spec
    spec/             - OpenAPI specification package
  @users/
    service/          - User management Fastify API with Prisma
    db/               - Prisma ORM package (PostgreSQL)
    sdk/              - Auto-generated TypeScript client
    spec/             - OpenAPI specification package
  @ai/
    service/          - Multi-provider LLM chat backend (Vercel AI Gateway, Anthropic, Ollama)
    spec/             - OpenAPI specification package (no SDK — streaming endpoints aren't generated)
  @weather/
    service/          - Real-time weather API + SSE stream (Ambient Weather)
    db/               - Prisma ORM package (PostgreSQL)

packages/
  @website/
    config/           - Shared TypeScript + Biome configuration
    tracing/          - OpenTelemetry tracing helper
    utils/            - Shared TypeScript utilities
    weather-station/  - React weather sonification component (Web Audio)
  @crow/              - Internal design system (theme + primitive components)
  @cli/               - Internal dev CLIs (cluster, db, dev, docker)

infra/
  helm/charts/        - Shared Helm chart templates
  k3s/flux/           - FluxCD GitOps manifests for k3s
  monitoring/         - Prometheus + Grafana + Loki configuration
  cloudflare/         - Cloudflare Worker (maintenance page)
  scripts/            - Local development helper scripts
```

## Build System

**Package Manager**: pnpm 10.x (workspace-based monorepo)
**Build Orchestration**: Turbo (with remote caching)
**Formatter/Linter**: Biome
**Container Runtime**: Docker with multi-stage builds

### Common Commands

```bash
pnpm install
pnpm run build           # all packages, dependency-ordered
pnpm run format
pnpm run dev             # all dev servers with hot reload
pnpm --filter @gateway/service build
pnpm run check           # type check
```

## Applications

### @app/www - Crowprose Homepage

`apps/www/` — https://www.crowprose.com

SSG-rendered homepage with blog, projects, and contributions pages. React Router file-based routing, MDX for blog posts, Vanilla Extract for styling.

Key pages: `/`, `/blog`, `/projects`, `/projects/weather-station`, `/contributions`.

### @app/dashboard - Multi-provider Chat

`apps/dashboard/` — https://app.crowprose.com

React + Vite SPA. Stateless single-shot chat against `@ai/service` via the gateway. Uses `@ai-sdk/react`'s `useChat` with `DefaultChatTransport`. No conversation history, model dropdown sourced from `/ai/models`.

Routes: `/login`, `/chat`, `/settings`, `/`.

### @gateway/service - API Gateway

`services/@gateway/service/` — http://localhost:3000 (dev), https://api.crowprose.com (prod)

Fastify REST API with TypeBox + OpenAPI auto-generation, Google OAuth (Arctic), JWT access/refresh (httpOnly refresh cookie), Prometheus metrics. Proxies authenticated traffic to `/ai/*` (with `x-user` injection); calls `@users/service` directly for OAuth user upsert.

### @ai/service - Multi-provider Chat Backend

`services/@ai/service/`

Fastify + Vercel AI SDK (v6). Single streaming endpoint (`POST /chat`) returning the AI SDK UI message stream. Provider dispatch by `vercel/`, `anthropic/`, `ollama/` model-id prefix. Stateless — no conversation history. `GET /models` returns the configured `ALLOWED_MODELS` allowlist. Trusts `x-user` header from the gateway; not exposed publicly.

### @users/service - User Management

`services/@users/service/`

Fastify CRUD over Prisma/Postgres. Internal-only.

### @weather/service - Weather Station

`services/@weather/service/`

Real-time weather data from an Ambient Weather station via Socket.IO; Postgres for history; SSE stream + REST endpoints. Currently exposed at https://weather.crowprose.com (Phase 4 of the revamp will fold it behind the gateway).

## Type-Safe API Pattern

```
Server (TypeBox) → OpenAPI Spec → @hey-api/openapi-ts → SDK → Type-safe Client
```

`@ai/service` is the exception: streaming endpoints don't generate cleanly so the dashboard uses `@ai-sdk/react` directly, not a generated SDK.

## Infrastructure

### Kubernetes Deployment

**Production**: k3s on rookery VM, FluxCD GitOps, Cloudflare Tunnel ingress.
**Local dev**: Minikube with local Docker registry.

Each app/service has a Helm chart in `helm/`:
- `values.yaml` - base values
- `values-local.yaml` - Minikube overrides
- `values-selfhosted.yaml` - k3s overrides

### Monitoring Stack

https://o11y.crowprose.com (Google OAuth protected). Prometheus + Grafana + Loki/Promtail + Alertmanager. ServiceMonitors must carry the `release: monitoring` label to be scraped.

### CI/CD (GitHub Actions)

- `ci.yml` — PR checks (build, lint, type-check)
- `build-images.yml` — Docker image builds (called by CD)
- `cd-selfhosted.yml` — builds images on push to main, updates Flux image tags

**Required secrets**: `DOCKERHUB_TOKEN`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `VERCEL_AI_GATEWAY_API_KEY`.

## Styling

**Framework**: Vanilla Extract (type-safe CSS-in-JS). Styles in `.css.ts` files. `@crow/theme` provides shared design tokens.

## Configuration

Shared configs in `packages/@website/config/`: `base.json`, `react.json`, `node.json`, `biome.json`. All packages extend these via `"extends": "@website/config/..."`.

## Development Notes

### Adding a New Service

1. `services/@<domain>/<name>/` with `package.json`, `Dockerfile`, `helm/` chart
2. ServiceMonitor with `release: monitoring` label
3. Flux HelmRelease in `infra/k3s/flux/apps/`, listed in `apps/kustomization.yaml`
4. Add to `build-images.yml` matrix and `cd-selfhosted.yml` image-tag updater

### Database (PostgreSQL)

Prisma commands example in `@users/db`:
```bash
pnpm run migrate:dev   # apply migrations
pnpm run db:push       # push schema (dev)
pnpm run studio        # Prisma Studio
```

### Environment Variables

Gateway:
- `GOOGLE_CLIENT_ID`/`SECRET`, `JWT_SECRET`, `ALLOWED_EMAILS`
- `FRONTEND_URL`, `BACKEND_URL`
- `USER_SERVICE_URL`, `AI_SERVICE_URL`

@ai/service:
- `VERCEL_AI_GATEWAY_API_KEY`, `ANTHROPIC_API_KEY`
- `OLLAMA_BASE_URL` (defaults to libvirt-bridge IP in production)
- `ALLOWED_MODELS` (comma-separated `provider/model` ids)

Clients:
- `VITE_API_URL` — gateway endpoint

### Production URLs

- https://www.crowprose.com — main website
- https://app.crowprose.com — chat dashboard
- https://api.crowprose.com — API gateway (auth, /ai/*)
- https://weather.crowprose.com — weather data (will move behind gateway in Phase 4)
- https://o11y.crowprose.com — Grafana (monitoring)
