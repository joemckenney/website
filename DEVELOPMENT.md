# Development Guide

This guide covers the three development environments for this project.

## Environments Overview

| Environment | Purpose | Database | Services |
|-------------|---------|----------|----------|
| **Local** | Fast iteration | Docker Compose | `pnpm run dev` |
| **Minikube** | K8s testing | PostgreSQL in cluster | Helm deployments |
| **Production** | Live | k3s on rookery | FluxCD GitOps |

---

## 1. Local Development

The fastest way to develop. Uses Docker Compose for databases and Turbo for services.

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker Desktop

### Quick Start

```bash
# Install dependencies
pnpm install

# Build packages (required before dev)
pnpm run build

# Start everything (databases, migrations, all services)
pnpm run dev
```

This uses the `dev` CLI which:
1. Starts PostgreSQL databases via docker compose
2. Waits for health checks
3. Runs Prisma migrations
4. Starts all services via turbo (streaming logs)
5. On Ctrl+C, stops everything cleanly

### Services

| Service | URL | Purpose |
|---------|-----|---------|
| API Gateway | http://localhost:3000 | REST API, OAuth |
| User Service | http://localhost:3001 | User management |
| Agent Service | http://localhost:3002 | AI agent backend |
| www | http://localhost:5173 | Main website |
| dashboard | http://localhost:5174 | App dashboard |

### Database CLI

```bash
# Interactive database browser
pnpm exec db shell    # Select and connect to a database
pnpm exec db studio   # Open Prisma Studio for a database
pnpm exec db logs     # View postgres logs
pnpm exec db dump     # Create database dump
```

---

## 2. Minikube (Local Kubernetes)

Test Kubernetes deployments locally before pushing to production.

### Prerequisites

- minikube
- kubectl
- helm
- Docker

### Cluster Management

The `cluster` CLI manages the local Kubernetes environment:

```bash
# First-time setup (installs addons, configures registry)
pnpm exec cluster setup

# Start the cluster
pnpm exec cluster start

# Check what's running
pnpm exec cluster status

# Build and deploy all services
pnpm exec cluster deploy

# View service logs
pnpm exec cluster logs api        # API service logs
pnpm exec cluster logs api -f     # Follow logs
pnpm exec cluster logs user       # User service logs

# Stop the cluster
pnpm exec cluster stop
```

### Service Shortcuts for Logs

| Shortcut | Service |
|----------|---------|
| `api`, `gateway` | api-service |
| `user`, `users` | user-service |
| `agent` | agent-service |
| `www` | www-web |
| `app`, `dashboard` | app-web |

### Accessing Services

After `cluster deploy`, services are available via minikube ingress:

```bash
# Get minikube IP
minikube ip

# Add to /etc/hosts:
# <minikube-ip> api.local www.local app.local
```

### Helm Commands

```bash
# List deployments
helm list

# View specific release
helm status api-service

# Rollback if needed
helm rollback api-service 1
```

---

## 3. Production (k3s on rookery)

Production is deployed via FluxCD GitOps on a self-hosted k3s cluster.

### Deployment Flow

1. Push to `main` branch
2. GitHub Actions builds Docker images with `selfhosted-sha-*` tags
3. `cd-selfhosted.yml` updates FluxCD manifests with new image tags
4. FluxCD reconciles and deploys to k3s

### Manual Operations

Requires the k3s kubeconfig:

```bash
export KUBECONFIG=~/.kube/k3s-config

# Check status
ssh rookery kubectl get pods -A

# View logs
ssh rookery kubectl logs -f deployment/api-service
```

### URLs

- https://www.crowprose.com - Main website
- https://app.crowprose.com - Dashboard
- https://api.crowprose.com - API Gateway
- https://o11y.crowprose.com - Monitoring (Grafana)

---

## Common Tasks

### Adding a New Service

1. Create service in `services/@<domain>/<name>/`
2. Add Helm chart in `helm/` subdirectory
3. Add to `pnpm-workspace.yaml` if needed
4. Add Docker build in CI workflow
5. Add deployment in CD workflow

### Database Migrations

```bash
# Create a new migration (local dev)
pnpm --filter @users/db run migrate:dev

# Deploy migrations (runs automatically in dev and k8s)
pnpm --filter @users/db run migrate:deploy
```

### Debugging

```bash
# Local: Check service logs
pnpm run dev  # Logs stream to terminal

# Minikube: Check pod logs
pnpm exec cluster logs <service> -f

# Production: Check pod logs
ssh rookery kubectl logs -f deployment/<service>
```

### Building Docker Images

```bash
# Build all images for local registry
pnpm run build:docker:local

# Or use Turbo directly
turbo run build:docker:local
```
