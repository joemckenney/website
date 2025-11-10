# Local Development with Minikube

This guide walks you through setting up a local Kubernetes environment using Minikube.

## Prerequisites

- Docker installed and running
- Minikube installed ([installation guide](https://minikube.sigs.k8s.io/docs/start/))
- kubectl installed
- Helm installed
- At least 4GB of free RAM

## Setup

### 1. Start Minikube

```bash
# Start with sufficient resources
minikube start --cpus=4 --memory=8192 --driver=docker

# Verify it's running
kubectl cluster-info
```

### 2. Enable Required Addons

```bash
# Enable ingress controller
minikube addons enable ingress

# Enable local container registry
minikube addons enable registry

# Enable metrics server (optional, for resource monitoring)
minikube addons enable metrics-server
```

### 3. Configure Local DNS

Add the following to your `/etc/hosts` file:

```bash
# Get minikube IP
minikube ip

# Add to /etc/hosts (replace <MINIKUBE_IP> with actual IP)
echo "<MINIKUBE_IP> api.local.test client.local.test" | sudo tee -a /etc/hosts
```

Example:
```
192.168.49.2 api.local.test client.local.test
```

### 4. Set Up Local Registry

Forward the registry port:

```bash
# In a separate terminal, keep this running
kubectl port-forward --namespace kube-system service/registry 5000:80
```

Or configure registry alias (recommended):

```bash
# Add registry alias to /etc/hosts
echo "127.0.0.1 localhost.localdomain" | sudo tee -a /etc/hosts
```

### 5. Build and Push Images

From the repository root:

```bash
# Build server image
cd apps/@app/server
docker build -t localhost:5000/app-server:latest -f Dockerfile ../..
docker push localhost:5000/app-server:latest

# Build client image
cd ../client
docker build -t localhost:5000/app-client:latest -f Dockerfile ../..
docker push localhost:5000/app-client:latest
```

Or use the helper script:

```bash
# From infrastructure directory
cd infrastructure
./scripts/build-local.sh
```

### 6. Configure Secrets

Edit `infrastructure/helm/values/local.yaml` and update the secrets section:

```yaml
app-server:
  secrets:
    googleClientId: "your-google-client-id"
    googleClientSecret: "your-google-client-secret"
    jwtSecret: "your-local-jwt-secret"
    allowedEmail: "your@email.com"
    frontendUrl: "http://client.local.test"
    backendUrl: "http://api.local.test"
```

### 7. Deploy Applications

```bash
# From infrastructure directory
cd infrastructure

# Deploy server
helm upgrade --install app-server \
  ./helm/charts/app-server \
  -f ./helm/values/local.yaml

# Deploy client
helm upgrade --install app-client \
  ./helm/charts/app-client \
  -f ./helm/values/local.yaml
```

Or use the helper script:

```bash
./scripts/deploy-local.sh
```

### 8. Verify Deployment

```bash
# Check pod status
kubectl get pods

# Check ingress
kubectl get ingress

# View logs
kubectl logs -f deployment/app-server
kubectl logs -f deployment/app-client
```

### 9. Access Applications

Open your browser:
- Client: http://client.local.test
- Server API: http://api.local.test
- Server API Docs: http://api.local.test/docs

## Development Workflow

### Rebuilding After Code Changes

```bash
# Rebuild and push images
./scripts/build-local.sh

# Restart deployments to pull new images
kubectl rollout restart deployment/app-server
kubectl rollout restart deployment/app-client

# Watch rollout status
kubectl rollout status deployment/app-server
kubectl rollout status deployment/app-client
```

### Viewing Logs

```bash
# Follow logs
kubectl logs -f deployment/app-server
kubectl logs -f deployment/app-client

# Get logs from specific pod
kubectl logs <pod-name>

# Get logs from previous container (after crash)
kubectl logs <pod-name> --previous
```

### Debugging

```bash
# Describe pod to see events
kubectl describe pod <pod-name>

# Get all events
kubectl get events --sort-by='.lastTimestamp'

# Execute command in pod
kubectl exec -it <pod-name> -- /bin/sh

# Port forward to pod directly
kubectl port-forward pod/<pod-name> 3000:3000
```

## Troubleshooting

### Images Not Found

If pods show `ImagePullBackOff` or `ErrImagePull`:

```bash
# Verify registry is running
kubectl get pods -n kube-system | grep registry

# Verify port-forward is active
kubectl port-forward --namespace kube-system service/registry 5000:80

# Rebuild and push images
./scripts/build-local.sh
```

### Ingress Not Working

```bash
# Verify ingress controller is running
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl get ingress
kubectl describe ingress app-server
kubectl describe ingress app-client

# Verify /etc/hosts entry
cat /etc/hosts | grep local.test

# Test with minikube tunnel (alternative)
minikube tunnel
```

### Pods Crashing

```bash
# Check pod logs
kubectl logs deployment/app-server

# Check pod events
kubectl describe pod <pod-name>

# Verify secrets are configured
kubectl get secrets
kubectl describe secret app-server-secrets
```

### Resource Issues

```bash
# Check resource usage
kubectl top nodes
kubectl top pods

# Increase minikube resources
minikube stop
minikube start --cpus=4 --memory=8192
```

## Cleanup

```bash
# Delete Helm releases
helm uninstall app-server
helm uninstall app-client

# Delete minikube cluster
minikube delete

# Remove /etc/hosts entries
sudo sed -i '/local.test/d' /etc/hosts
```

## Tips

1. **Keep Registry Port-Forward Running**: Create a systemd service or use tmux/screen
2. **Use ImagePullPolicy: Never**: Specified in local.yaml to avoid pulling from remote registries
3. **Resource Limits**: Adjust in local.yaml if your machine has limited resources
4. **Fast Iteration**: Use `kubectl rollout restart` instead of helm upgrade for quick deployments
5. **Minikube Dashboard**: Run `minikube dashboard` for a web UI

## Next Steps

- Set up production deployment: [Production Guide](../production/README.md)
- Configure CI/CD pipeline
- Add monitoring with Prometheus/Grafana
