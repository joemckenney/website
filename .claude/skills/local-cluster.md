# Local Kubernetes Cluster Management

This project uses minikube for local Kubernetes development. The `cluster` CLI manages the cluster lifecycle.

## CLI Commands

All commands run from the repository root:

```bash
# First-time setup - installs minikube addons, configures registry
pnpm exec cluster setup

# Start cluster and registry port-forward
pnpm exec cluster start

# Show cluster status (pods, services, ingresses)
pnpm exec cluster status

# Build Docker images and deploy all services via Helm
pnpm exec cluster deploy

# View service logs
pnpm exec cluster logs <service>
pnpm exec cluster logs <service> -f          # Follow logs
pnpm exec cluster logs <service> --tail 100  # Last 100 lines

# Stop cluster and port-forward
pnpm exec cluster stop
```

## Service Shortcuts

When using `logs`, these shortcuts resolve to full service names:

| Shortcut | Resolves To |
|----------|-------------|
| `api`, `gateway` | api-service |
| `user`, `users` | user-service |
| `agent` | agent-service |
| `www` | www-web |
| `app`, `dashboard` | app-web |

## Typical Workflow

1. **First time**: `pnpm exec cluster setup`
2. **Start working**: `pnpm exec cluster start`
3. **Deploy changes**: `pnpm exec cluster deploy`
4. **Check status**: `pnpm exec cluster status`
5. **Debug issues**: `pnpm exec cluster logs api -f`
6. **Done for day**: `pnpm exec cluster stop`

## What `deploy` Does

1. Checks cluster is running
2. Checks registry port-forward is running
3. Builds Docker images via `turbo run build:docker:local`
4. Deploys services via `turbo run deploy:helm:local`

## Troubleshooting

### Cluster not starting
```bash
minikube delete
pnpm exec cluster setup
pnpm exec cluster start
```

### Registry port-forward died
```bash
pnpm exec cluster stop
pnpm exec cluster start
```

### Pod stuck in CrashLoopBackOff
```bash
# Check logs
pnpm exec dev-cluster logs <service>

# Describe pod for events
kubectl describe pod <pod-name>

# Restart deployment
kubectl rollout restart deployment/<deployment-name>
```

### Helm release stuck
```bash
# Check release status
helm list

# Force uninstall
helm uninstall <release-name>

# Redeploy
pnpm exec cluster deploy
```

## Direct kubectl/helm Access

For operations not covered by the CLI:

```bash
# All pods
kubectl get pods -A

# All services
kubectl get svc -A

# Helm releases
helm list

# Pod shell
kubectl exec -it <pod-name> -- sh

# Port forward a specific service
kubectl port-forward svc/<service> <local-port>:<service-port>
```

## Environment

- **Cluster**: minikube with docker driver
- **Registry**: In-cluster registry at localhost:5000 (via port-forward)
- **Ingress**: nginx-ingress addon
- **DNS**: metrics-server addon

## Package Location

The CLI is implemented in `packages/@cli/cluster/`:
- `bin/cluster.ts` - CLI entry point
- `src/commands/` - Command implementations
- `src/utils/` - Shell, minikube, and color utilities
