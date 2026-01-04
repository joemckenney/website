# Infrastructure Scripts

Helper scripts for building and deploying applications.

## Local Development Scripts

### setup-local-registry.sh
Sets up the minikube registry and port-forwarding for local development.

```bash
./scripts/setup-local-registry.sh
```

**What it does:**
- Enables minikube registry addon
- Waits for registry pod to be ready
- Sets up port-forward from localhost:5000 to registry service
- Verifies registry is accessible

**Note:** Keep the terminal open or the port-forward will stop. For persistent operation, use `registry-daemon.sh` instead.

### registry-daemon.sh
Keeps the registry port-forward running persistently with auto-restart.

```bash
# Run in foreground (keeps terminal open)
./scripts/registry-daemon.sh

# Run in background
nohup ./scripts/registry-daemon.sh > /tmp/registry-daemon.log 2>&1 &

# Check if running
ps aux | grep registry-daemon

# Stop it
pkill -f registry-daemon
```

**What it does:**
- Monitors minikube and registry pod status
- Automatically restarts port-forward if it dies
- Enables registry addon if not enabled
- Runs indefinitely until stopped

**Recommended for:**
- Long-running development sessions
- Avoiding manual port-forward restarts
- Background operation during development

### build-local.sh
Builds Docker images for local minikube deployment.

```bash
./scripts/build-local.sh
```

**What it does:**
- Checks if minikube is running
- Uses minikube's Docker daemon
- Builds app-server and app-client images
- Tags images as `localhost:5000/app-server:latest` and `localhost:5000/app-client:latest`
- Pushes to local registry (if port-forward is running)
- Falls back to minikube's Docker daemon (if registry not accessible)

**Images built:**
- `localhost:5000/app-server:latest` - Fastify API server
- `localhost:5000/app-client:latest` - React + nginx client

**Requirements:**
- Minikube running
- Registry port-forward active (or uses minikube Docker daemon)

### deploy-local.sh
Deploys applications to local minikube cluster using Helm.

```bash
./scripts/deploy-local.sh
```

**What it does:**
- Checks if minikube is running
- Creates namespace if it doesn't exist
- Deploys app-server using Helm
- Deploys app-client using Helm
- Uses `helm/values/local.yaml` for configuration
- Waits for deployments to be ready

**Requirements:**
- Images built (run `build-local.sh` first)
- `helm/values/local.yaml` configured with secrets

## Production Scripts

### build-production.sh
Builds and pushes Docker images to production registry.

```bash
export CONTAINER_REGISTRY=registry.digitalocean.com/your-registry
./scripts/build-production.sh
```

**What it does:**
- Validates CONTAINER_REGISTRY environment variable
- Builds app-server and app-client images
- Tags with production registry URL
- Pushes to production registry

**Requirements:**
- CONTAINER_REGISTRY environment variable set
- Authenticated to container registry (`docker login` or cloud CLI)

### deploy-production.sh
Deploys applications to production Kubernetes cluster.

```bash
./scripts/deploy-production.sh
```

**What it does:**
- Checks kubectl connection to cluster
- Creates namespace if it doesn't exist
- Deploys app-server using Helm
- Deploys app-client using Helm
- Uses `helm/values/production.yaml` for configuration
- Configures ingress with SSL certificates

**Requirements:**
- KUBECONFIG set to production cluster
- Images pushed to production registry
- `helm/values/production.yaml` configured

## Common Workflows

### Initial Setup (Local)
```bash
# 1. Start minikube
minikube start --cpus=4 --memory=8192

# 2. Enable addons
minikube addons enable ingress
minikube addons enable registry

# 3. Start registry (in separate terminal or background)
./scripts/setup-local-registry.sh
# OR
nohup ./scripts/registry-daemon.sh > /tmp/registry-daemon.log 2>&1 &

# 4. Build and deploy
./scripts/build-local.sh
./scripts/deploy-local.sh
```

### Update Application (Local)
```bash
# Make code changes, then:
./scripts/build-local.sh
kubectl rollout restart deployment/app-server deployment/app-client
```

### Initial Setup (Production)
```bash
# 1. Set up infrastructure with Terraform
cd terraform/environments/production
terraform apply

# 2. Configure kubectl
export KUBECONFIG=$(terraform output -raw kubeconfig_location)

# 3. Set registry and build
cd ../../../
export CONTAINER_REGISTRY=registry.digitalocean.com/your-registry
docker login registry.digitalocean.com  # or: doctl registry login
./scripts/build-production.sh

# 4. Deploy
./scripts/deploy-production.sh
```

### Update Application (Production)
```bash
# Make code changes, then:
export CONTAINER_REGISTRY=registry.digitalocean.com/your-registry
./scripts/build-production.sh
kubectl rollout restart deployment/app-server deployment/app-client -n default
```

## Troubleshooting

### "Minikube is not running"
```bash
minikube start --cpus=4 --memory=8192
```

### "Local registry port-forward not detected"
```bash
# Check if port-forward is running
lsof -i :5000

# If not, start it
./scripts/setup-local-registry.sh

# Or use daemon for persistent operation
nohup ./scripts/registry-daemon.sh > /tmp/registry-daemon.log 2>&1 &
```

### "Failed to push image to registry"
**Local:**
```bash
# Restart registry setup
pkill -f 'port-forward.*registry'
./scripts/setup-local-registry.sh
```

**Production:**
```bash
# Re-authenticate to registry
docker login $CONTAINER_REGISTRY
# or for DigitalOcean:
doctl registry login
```

### Images pull fails in pods
**Local:**
If registry push failed, images are in minikube's Docker daemon. Update Helm values:
```yaml
image:
  pullPolicy: Never  # Use local images in minikube
```

**Production:**
Verify images were pushed:
```bash
docker images | grep $CONTAINER_REGISTRY
```

Create image pull secret if needed:
```bash
kubectl create secret docker-registry regcred \
  --docker-server=$CONTAINER_REGISTRY \
  --docker-username=$DOCKER_USER \
  --docker-password=$DOCKER_PASSWORD
```

## Environment Variables

### Local Development
- None required (uses minikube defaults)

### Production
- `CONTAINER_REGISTRY` - Full registry URL (e.g., `registry.digitalocean.com/myapp`)
- `KUBECONFIG` - Path to kubectl config file for production cluster

## Script Exit Codes

All scripts follow standard exit codes:
- `0` - Success
- `1` - Error (with descriptive message)

## Logs

### Registry Daemon Logs
```bash
# If running in background
tail -f /tmp/registry-daemon.log

# Check if still running
ps aux | grep registry-daemon
```

### Build Logs
Build scripts output to stdout. Redirect if needed:
```bash
./scripts/build-local.sh 2>&1 | tee build.log
```

## Security Notes

1. **Never commit secrets** - Keep `helm/values/*.yaml` files with sensitive data out of git
2. **Registry authentication** - Ensure proper authentication before pushing images
3. **Network access** - Verify firewall rules allow access to registries and clusters
4. **Image scanning** - Consider scanning images before deployment:
   ```bash
   docker scan localhost:5000/app-server:latest
   ```
