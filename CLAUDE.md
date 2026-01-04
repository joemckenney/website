# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A production-ready TypeScript monorepo demonstrating modern full-stack development with type-safe API generation, Kubernetes deployment, and comprehensive observability. Deployed to Vultr VKE with automated CI/CD.

## Repository Structure

```
apps/
  www/                - Main web app: Weather sonification with Chrome AI
  dashboard/          - React + Vite demo client with sidebar UI

services/
  @gateway/
    service/          - Fastify API Gateway with OpenAPI/TypeBox, OAuth, JWT auth
    sdk/              - Auto-generated TypeScript client from OpenAPI spec
    spec/             - OpenAPI specification package
  @users/
    service/          - User management Fastify API with Prisma
    db/               - Prisma ORM package (PostgreSQL)
    sdk/              - Auto-generated TypeScript client
    spec/             - OpenAPI specification package

packages/
  @website/
    config/           - Shared TypeScript + Biome configuration
    utils/            - Shared TypeScript utilities

infra/
  helm/charts/        - Shared Helm chart templates
  monitoring/         - Prometheus + Grafana + Loki configuration
  terraform/          - Vultr VKE infrastructure as code
  scripts/            - Local development helper scripts
```

## Build System

**Package Manager**: pnpm 10.x (workspace-based monorepo)
**Build Orchestration**: Turbo (with remote caching)
**Formatter/Linter**: Biome
**Container Runtime**: Docker with multi-stage builds

### Common Commands

```bash
# Install dependencies
pnpm install

# Build all packages (respects dependency order via Turbo)
pnpm run build

# Format all code
pnpm run format

# Run all dev servers with hot reload
pnpm run dev

# Build specific workspace
pnpm --filter @gateway/service build
pnpm --filter @app/dashboard build

# Type check
pnpm run check
```

### Development Workflow

`pnpm run dev` starts all development servers with automatic rebuilding:

- **@gateway/service**: Fastify server with `tsx watch`, regenerates OpenAPI spec on changes
- **@gateway/sdk**: Rebuilds when OpenAPI spec changes (Turbo `interruptible`)
- **@users/service**: User management API with `tsx watch`
- **@app/dashboard**: Vite dev server with HMR
- **@app/www**: Vite dev server with HMR

Turbo orchestrates dependency order automatically.

## Applications

### @app/www - Weather Sonification (Primary App)

**Location**: `apps/www/`
**URL**: https://www.joemckenney.com

Experimental web app using Chrome's built-in AI (Gemini Nano) to generate ambient soundscapes from weather data.

**Key Features**:
- Chrome Built-in AI (Gemini Nano via Prompt API)
- Web Audio API synthesis with multi-oscillator additive synthesis
- Real-time frequency visualization
- Geolocation + Open-Meteo weather API

**Browser Requirements**: Chrome Dev/Canary 127+ with experimental flags enabled.

### @gateway/service - API Gateway

**Location**: `services/@gateway/service/`
**URLs**: http://localhost:3000 (dev), https://api.joemckenney.com (prod)

Fastify REST API with:
- TypeBox schema validation
- OpenAPI spec auto-generation (`/docs` for Swagger UI)
- Google OAuth authentication (via Arctic)
- JWT access/refresh tokens (httpOnly cookies for refresh)
- Prometheus metrics endpoint (`/metrics`)

### @app/dashboard - Demo Client

**Location**: `apps/dashboard/`
**URL**: https://app.joemckenney.com

React + Vite frontend demonstrating type-safe API integration:
- Collapsible sidebar navigation (Claude.ai-style)
- User avatar with logout menu
- Debug page for token inspection
- Chat prompt interface (placeholder for future agent)

### @users/service - User Management

**Location**: `services/@users/service/`

Fastify API for user CRUD with:
- Prisma ORM (PostgreSQL)
- TypeBox schemas
- Prometheus metrics

## Type-Safe API Pattern

```
Server (TypeBox) → OpenAPI Spec → @hey-api/openapi-ts → SDK → Type-safe Client
```

1. Define routes with TypeBox schemas in `@gateway/service` or `@users/service`
2. OpenAPI spec generated to `dist/openapi.json` on build
3. SDK packages generate typed client from spec
4. Clients import SDK for full type safety

## Infrastructure

### Kubernetes Deployment

**Local**: Minikube with local Docker registry
**Production**: Vultr VKE (Kubernetes 1.34)

Each app has a Helm chart in its `helm/` directory:
- `values.yaml` - Base values
- `values-local.yaml` - Minikube overrides
- `values-prod.yaml` - Production overrides

### Monitoring Stack

**URL**: https://o11y.joemckenney.com (Google OAuth protected)

- **Prometheus**: Metrics collection from ServiceMonitors
- **Grafana**: Dashboards and alerting
- **Loki**: Log aggregation via Promtail
- **Alertmanager**: Email notifications for critical alerts

Configuration in `infra/monitoring/values-prod.yaml`.

### CI/CD (GitHub Actions)

**Workflows**:
- `ci.yml` - PR checks (build, lint, type-check)
- `build-images.yml` - Docker image builds
- `cd.yml` - Production deployment with smoke tests

**Required Secrets**:
- `KUBE_CONFIG_PROD` - Base64 Vultr kubeconfig
- `DOCKERHUB_TOKEN` - Docker Hub credentials
- `GOOGLE_CLIENT_ID/SECRET` - OAuth credentials
- `JWT_SECRET` - Token signing key

### Helm Deployment Commands

```bash
# Local (Minikube)
pnpm run deploy:helm:local

# Production (requires KUBECONFIG)
KUBECONFIG=~/.kube/vultr-prod-config helm upgrade --install <release> <chart> \
  -f values-prod.yaml \
  --set image.tag=<tag>
```

### Monitoring Commands

```bash
# Check Prometheus targets
kubectl exec prometheus-monitoring-kube-prometheus-prometheus-0 -c prometheus -- \
  wget -qO- 'http://localhost:9090/api/v1/targets'

# View Grafana
kubectl port-forward svc/monitoring-grafana 3000:80

# Check logs via Loki
# Use Grafana Explore with Loki datasource
```

## Styling

**Framework**: Vanilla Extract (type-safe CSS-in-JS)

Styles in `.css.ts` files with type-safe tokens. Each app defines its own design system.

## Configuration

Shared configs in `packages/@website/config/`:
- `base.json`, `react.json`, `node.json` - TypeScript configs
- `biome.json` - Linting and formatting

All packages extend these via `"extends": "@website/config/..."`.

## Development Notes

### Adding a New Service

1. Create directory in `services/@<domain>/<name>/`
2. Add `package.json` with workspace dependencies
3. Create Helm chart in `helm/` subdirectory
4. Add ServiceMonitor for Prometheus (with `release: monitoring` label)
5. Update `pnpm-workspace.yaml` if needed
6. Add to CI/CD workflows

### ServiceMonitor Labels

Prometheus only scrapes ServiceMonitors with `release: monitoring` label:

```yaml
metadata:
  labels:
    release: monitoring
```

### Database (PostgreSQL)

Prisma commands in `@users/db`:
```bash
pnpm run migrate:dev   # Run migrations
pnpm run db:push       # Push schema changes
pnpm run studio        # Open Prisma Studio
```

### Environment Variables

API services use:
- `GOOGLE_CLIENT_ID/SECRET` - OAuth
- `JWT_SECRET` - Token signing
- `FRONTEND_URL` - CORS origin
- `DATABASE_URL` - PostgreSQL connection (users-service)

Clients use:
- `VITE_API_URL` - API endpoint

### Production URLs

- https://www.joemckenney.com - Main web app
- https://app.joemckenney.com - Demo client
- https://api.joemckenney.com - API gateway
- https://o11y.joemckenney.com - Grafana (monitoring)
