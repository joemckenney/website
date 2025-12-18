# Local Cluster Quick Start

Simplified scripts for managing your local Kubernetes development cluster.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [helm](https://helm.sh/docs/intro/install/)

## Quick Start

```bash
# 1. Setup cluster
pnpm run cluster:setup

# 2. Deploy all services
pnpm run cluster:deploy

# 3. Port-forward databases (separate terminal)
pnpm run cluster:port-forward

# 4. Add to /etc/hosts
echo "$(minikube ip) api.local.com app.local.com www.local.com" | sudo tee -a /etc/hosts

# 5. Access services
open http://api.local.com
```

## Commands

Run from repository root:

| Command | Script | Description |
|---------|--------|-------------|
| `pnpm run cluster:setup` | `setup-local-cluster.sh` | Initialize local cluster |
| `pnpm run cluster:deploy` | `deploy-all-local.sh` | Build & deploy all services |
| `pnpm run cluster:port-forward` | `port-forward-databases.sh` | Port-forward databases |
| `pnpm run cluster:status` | kubectl command | Show cluster status |
| `pnpm run cluster:teardown` | `teardown-local-cluster.sh` | Delete cluster |

## What Each Script Does

### setup-local-cluster.sh

Initializes a local Kubernetes cluster with:
- Minikube with 4 CPUs, 8GB RAM, 50GB disk
- Required addons (ingress, metrics-server, registry)
- Helm repositories
- Namespace setup

### deploy-all-local.sh

Full deployment pipeline:
1. Deploy PostgreSQL databases
2. Build Docker images (api, user, www, app)
3. Deploy services via Helm
4. Wait for everything to be ready

### port-forward-databases.sh

Sets up port forwarding:
- `user-service-postgres` → `localhost:5432`

Keep this running in a separate terminal during development.

### teardown-local-cluster.sh

Completely removes the local cluster:
- Asks for confirmation
- Stops minikube
- Deletes cluster

## Development Workflow

### Initial Setup

```bash
pnpm run cluster:setup
pnpm run cluster:deploy

# In separate terminal
pnpm run cluster:port-forward
```

### Rebuild Everything

```bash
pnpm run cluster:teardown  # Asks for confirmation
pnpm run cluster:setup
pnpm run cluster:deploy
```

### Rebuild Single Service

```bash
cd apps/@user/service

# Build image
pnpm run build:docker:local

# Deploy
pnpm run deploy:helm:local

# Or force restart
kubectl rollout restart deployment/user-service
```

### Database Operations

```bash
# With port-forward running
cd apps/@user/service
cp .env.example .env

# Run migrations
pnpm run prisma:migrate:dev

# Browse database
pnpm run prisma:studio
```

## Troubleshooting

### Check Status

```bash
pnpm run cluster:status
# Shows pods, services, ingress
```

### View Logs

```bash
kubectl logs -f deployment/user-service
kubectl logs -f deployment/api-service
kubectl logs -f statefulset/user-service-postgres-postgresql
```

### Common Issues

**ImagePullBackOff:**
```bash
# Ensure you're using minikube's Docker
eval $(minikube docker-env)
cd apps/@user/service
pnpm run build:docker:local
```

**Can't connect to database:**
```bash
# Check port-forward is running
pnpm run cluster:port-forward

# Check PostgreSQL is ready
kubectl get pods | grep postgres
```

**Ingress not working:**
```bash
# Check addon
minikube addons list | grep ingress

# Verify /etc/hosts
cat /etc/hosts | grep local.com

# Should show: <minikube-ip> api.local.com app.local.com www.local.com
```

**Out of resources:**
```bash
# Clean up
minikube ssh -- docker system prune -a -f

# Or start fresh with more resources
pnpm run cluster:teardown
minikube start --cpus=6 --memory=12288
```

## Architecture

```
┌────────────────────────────────────────┐
│          minikube cluster              │
│                                        │
│  ┌──────────┐      ┌──────────────┐   │
│  │   @api   │◄─────┤    @user     │   │
│  │  service │      │   service    │   │
│  │ (gateway)│      │              │   │
│  └────┬─────┘      └──────┬───────┘   │
│       │                   │           │
│       │            ┌──────▼────────┐  │
│       │            │  PostgreSQL   │  │
│       │            └───────────────┘  │
│  ┌────▼──────┐    ┌──────────────┐   │
│  │   @www    │    │     @app     │   │
│  │    web    │    │      web     │   │
│  └────┬──────┘    └──────┬───────┘   │
│       │                  │            │
│  ┌────▼──────────────────▼────────┐  │
│  │      nginx ingress             │  │
│  └────────────────────────────────┘  │
└────────────────────────────────────────┘
               │
               ▼
        localhost:80
     (via /etc/hosts)
```

## Resource Allocation

Default minikube config:
- CPUs: 4
- Memory: 8GB
- Disk: 50GB

Typical usage:
- Minikube: ~2GB
- PostgreSQL: ~512MB
- Services: ~128-256MB each
- ~2GB remaining for builds
