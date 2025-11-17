# Production Deployment Guide: Vultr Kubernetes

This guide walks through deploying the monorepo apps to a production Vultr Kubernetes cluster.

## Prerequisites

- Vultr account
- Docker Hub account
- kubectl installed locally
- helm installed locally
- Access to manage DNS for joemckenney.com

## Phase 1: Create Vultr Kubernetes Cluster

### 1. Create VKE Cluster

1. Log in to [Vultr Dashboard](https://my.vultr.com/)
2. Navigate to "Kubernetes" → "Add Cluster"
3. Configure cluster:
   - **Cluster Name**: `joemckenney-prod`
   - **Location**: Choose closest to your users (e.g., "New York")
   - **Version**: Latest stable Kubernetes version
   - **Node Pool**:
     - Plan: Choose based on needs (recommend: 2 vCPU, 4GB RAM minimum)
     - Node count: 1 (single node for now, can scale later)
4. Click "Deploy Now"
5. Wait ~5-10 minutes for cluster provisioning

### 2. Download Kubeconfig

1. Once cluster is "Running", click on cluster name
2. Click "Download Configuration"
3. Save to `~/.kube/vultr-prod-config`
4. Set kubectl context:
   ```bash
   export KUBECONFIG=~/.kube/vultr-prod-config
   kubectl get nodes  # Verify connectivity
   ```

## Phase 2: Install Cluster Infrastructure

### 3. Install NGINX Ingress Controller

```bash
# Add Helm repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install ingress controller
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer

# Wait for LoadBalancer IP (this is your cluster's public IP)
kubectl get svc -n ingress-nginx nginx-ingress-ingress-nginx-controller --watch
```

**IMPORTANT**: Note the EXTERNAL-IP - this is what you'll point your DNS to!

### 4. Install cert-manager

```bash
# Add Helm repo
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager with CRDs
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

# Verify installation
kubectl get pods -n cert-manager
```

### 5. Create Let's Encrypt ClusterIssuer

```bash
# Apply the ClusterIssuer from infrastructure/k8s/
kubectl apply -f infrastructure/k8s/letsencrypt-prod.yaml

# Verify
kubectl get clusterissuer
```

## Phase 3: Prepare Docker Images

### 6. Set up Docker Hub

1. Create account at [hub.docker.com](https://hub.docker.com)
2. Create repositories (or they'll be auto-created on push):
   - `YOUR_USERNAME/www-app`
   - `YOUR_USERNAME/app-client`
   - `YOUR_USERNAME/app-server`
3. Login locally:
   ```bash
   docker login
   ```

### 7. Update Production Values Files

1. Update `apps/@www/app/helm/values-prod.yaml`:
   ```yaml
   image:
     repository: YOUR_DOCKERHUB_USERNAME/www-app
   ```

2. Update `apps/@app/app/helm/values-prod.yaml`:
   ```yaml
   image:
     repository: YOUR_DOCKERHUB_USERNAME/app-client
   ```

3. Create `apps/@api/app/helm/values-prod.yaml` from example:
   ```bash
   cp apps/@api/app/helm/values-prod.yaml.example apps/@api/app/helm/values-prod.yaml
   ```
   Then edit and fill in:
   - Docker Hub username
   - Production OAuth credentials (create new OAuth client with `https://api.joemckenney.com/auth/google/callback`)
   - Strong JWT secret (generate with `openssl rand -base64 32`)

### 8. Build and Push Images

```bash
# Build and push all images
./infrastructure/scripts/build-prod.sh

# Or build individually:
cd apps/@www/app && pnpm run build:docker:prod && docker push YOUR_USERNAME/www-app:latest
cd apps/@app/app && pnpm run build:docker:prod && docker push YOUR_USERNAME/app-client:latest
cd apps/@api/app && pnpm run build:docker:prod && docker push YOUR_USERNAME/app-server:latest
```

## Phase 4: Deploy Applications

### 9. Deploy to Cluster

```bash
# Ensure you're using the Vultr kubeconfig
export KUBECONFIG=~/.kube/vultr-prod-config

# Deploy all apps
./infrastructure/scripts/deploy-prod.sh

# Or deploy individually:
cd apps/@www/app && pnpm run deploy:helm:prod
cd apps/@app/app && pnpm run deploy:helm:prod
cd apps/@api/app && pnpm run deploy:helm:prod
```

### 10. Verify Deployment

```bash
# Check pods
kubectl get pods

# Check ingresses
kubectl get ingress

# Check certificates (may take 1-2 minutes to issue)
kubectl get certificate
```

## Phase 5: Configure DNS

### 11. Update DNS Records

Get your LoadBalancer IP:
```bash
kubectl get svc -n ingress-nginx nginx-ingress-ingress-nginx-controller
```

Update DNS for joemckenney.com (Vultr DNS, Cloudflare, or your provider):

Add/Update A records:
- `www.joemckenney.com` → EXTERNAL-IP
- `api.joemckenney.com` → EXTERNAL-IP
- `app.joemckenney.com` → EXTERNAL-IP

**DNS Propagation**: May take 5-60 minutes

### 12. Verify HTTPS

Once DNS propagates:
```bash
# Check certificates
kubectl get certificate

# Test endpoints
curl https://www.joemckenney.com
curl https://api.joemckenney.com/health  # or your health endpoint
curl https://app.joemckenney.com
```

All should return valid responses over HTTPS!

### 13. Test OAuth Flow

1. Visit https://app.joemckenney.com
2. Try OAuth login
3. Should redirect to Google, then back to app

## Troubleshooting

### Certificate not issuing

```bash
# Check certificate status
kubectl describe certificate www-app-tls

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager

# Common issues:
# - DNS not propagated yet (wait longer)
# - Let's Encrypt rate limit (use staging issuer first)
```

### Pod not starting

```bash
# Check pod logs
kubectl logs POD_NAME

# Check events
kubectl describe pod POD_NAME

# Common issues:
# - Image pull error (check Docker Hub credentials)
# - Resource limits too low
# - Missing secrets
```

### Ingress not routing

```bash
# Check ingress
kubectl describe ingress INGRESS_NAME

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

## Maintenance

### Update application

```bash
# Build new image
cd apps/@www/app
pnpm run build:docker:prod
docker push YOUR_USERNAME/www-app:latest

# Rolling update
kubectl rollout restart deployment/www-app
```

### Scale application

```bash
# Edit values file
replicaCount: 3

# Upgrade release
helm upgrade www-app ./helm -f ./helm/values-prod.yaml
```

### Monitor cluster

```bash
# Check resource usage
kubectl top nodes
kubectl top pods

# Check logs
kubectl logs -f POD_NAME
```

## Cost Optimization

- Start with single node, scale as needed
- Use autoscaling for variable traffic
- Consider spot instances for non-critical workloads
- Monitor with Vultr's built-in metrics

## Security Best Practices

- ✅ All traffic over HTTPS (enforced)
- ✅ Secrets stored in Kubernetes secrets (not in git)
- ✅ OAuth with production credentials
- ⚠️ Consider adding authentication for API endpoints
- ⚠️ Set up monitoring/alerting
- ⚠️ Regular security updates

## Next Steps

- Set up monitoring (Prometheus/Grafana)
- Configure log aggregation
- Set up automated backups
- Implement CI/CD pipeline
- Add health checks and readiness probes
