# Quick Start Guide

Choose your environment and follow the appropriate guide.

## Local Development (Minikube)

**Time**: ~30 minutes
**Cost**: Free
**Best for**: Development, testing, learning Kubernetes

```bash
# 1. Prerequisites
brew install minikube kubectl helm  # macOS
# or use your package manager

# 2. Start minikube
minikube start --cpus=4 --memory=8192

# 3. Enable addons
minikube addons enable ingress
minikube addons enable registry

# 4. Configure DNS
echo "$(minikube ip) api.local.test client.local.test" | sudo tee -a /etc/hosts

# 5. Build images
cd infrastructure
./scripts/build-local.sh

# 6. Configure secrets
vim helm/values/local.yaml
# Update Google OAuth credentials and other secrets

# 7. Deploy
./scripts/deploy-local.sh

# 8. Access
open http://client.local.test
open http://api.local.test/docs
```

**Full guide**: [Local Development Setup](./terraform/environments/local/README.md)

## Production Deployment (Vultr)

**Time**: ~1 hour
**Cost**: ~$60-130/month
**Best for**: Production workloads, scalable applications

```bash
# 1. Prerequisites
brew install terraform kubectl helm  # macOS
# Get Vultr API key from: https://my.vultr.com/settings/#settingsapi

# 2. Configure Terraform
cd infrastructure/terraform/environments/production
cp terraform.tfvars.example terraform.tfvars
vim terraform.tfvars  # Add your Vultr API key

# 3. Create infrastructure
terraform init
terraform apply
export KUBECONFIG=$(terraform output -raw kubeconfig_location)

# 4. Wait for cluster
kubectl wait --for=condition=ready --all nodes --timeout=300s

# 5. Get load balancer IP
kubectl get svc -n ingress-nginx ingress-nginx-controller
# Point your DNS to this IP

# 6. Configure container registry (DigitalOcean example)
doctl registry login

# 7. Build and push images
cd ../../../
export CONTAINER_REGISTRY=registry.digitalocean.com/your-registry
./scripts/build-production.sh

# 8. Configure production values
vim helm/values/production.yaml
# Update domains, image repositories, secrets

# 9. Deploy
./scripts/deploy-production.sh

# 10. Verify SSL certificates
kubectl get certificates

# 11. Access
open https://client.yourdomain.com
```

**Full guide**: [Production Deployment Guide](./terraform/environments/production/README.md)

## What Gets Deployed

### Applications

1. **app-server** (Fastify API)
   - Google OAuth authentication
   - JWT with httpOnly cookies
   - REST API with OpenAPI docs
   - Health checks at `/ping`
   - Swagger UI at `/docs`

2. **app-client** (React SPA)
   - Authentication UI
   - API client with generated SDK
   - Served with nginx

### Infrastructure (Production)

- Kubernetes cluster (VKE on Vultr)
- Nginx Ingress Controller (with load balancer)
- Cert-Manager (Let's Encrypt SSL)
- Autoscaling (2-5 nodes)
- Firewall rules

## Common Commands

### View Status
```bash
kubectl get pods                # Pod status
kubectl get ingress             # Ingress routes
kubectl get certificates        # SSL certificates
```

### View Logs
```bash
kubectl logs -f deployment/app-server
kubectl logs -f deployment/app-client
```

### Update Applications
```bash
./scripts/build-<environment>.sh   # Build images
./scripts/deploy-<environment>.sh  # Deploy updates
```

### Scale
```bash
kubectl scale deployment app-server --replicas=5
```

### Debug
```bash
kubectl describe pod <pod-name>
kubectl exec -it <pod-name> -- /bin/sh
kubectl get events --sort-by='.lastTimestamp'
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  User Browser                                   │
│                                                 │
└────────────────┬────────────────────────────────┘
                 │
                 │ HTTPS (443)
                 │
┌────────────────▼────────────────────────────────┐
│                                                 │
│  Nginx Ingress Controller                       │
│  ├─ SSL Termination (Let's Encrypt)            │
│  ├─ Routing by hostname                        │
│  └─ Load balancing                             │
│                                                 │
└────────┬────────────────────┬───────────────────┘
         │                    │
         │                    │
         │                    │
┌────────▼─────────┐   ┌──────▼──────────┐
│                  │   │                 │
│  app-client      │   │  app-server     │
│  (nginx)         │   │  (Fastify)      │
│                  │   │                 │
│  Serves:         │   │  Provides:      │
│  - React SPA     │   │  - REST API     │
│  - Static files  │   │  - OAuth        │
│                  │   │  - JWT tokens   │
│                  │   │                 │
│  Pods: 2-10      │   │  Pods: 2-10     │
│  Autoscaling: ✓  │   │  Autoscaling: ✓ │
│                  │   │                 │
└──────────────────┘   └─────────────────┘
```

## File Structure

```
infrastructure/
├── README.md                 # Main documentation
├── QUICKSTART.md            # This file
├── .gitignore               # Git ignore rules
├── scripts/                 # Helper scripts
│   ├── build-local.sh
│   ├── deploy-local.sh
│   ├── build-production.sh
│   └── deploy-production.sh
├── helm/                    # Helm charts
│   ├── charts/
│   │   ├── app-server/     # Server chart
│   │   └── app-client/     # Client chart
│   └── values/
│       ├── local.yaml      # Local config
│       └── production.yaml # Production config
└── terraform/              # Infrastructure as Code
    ├── modules/
    │   └── vultr-vke/     # VKE cluster module
    └── environments/
        ├── local/         # Local docs
        └── production/    # Production config
```

## Troubleshooting

### Images not found (local)
```bash
eval $(minikube docker-env)
./scripts/build-local.sh
kubectl rollout restart deployment/app-server deployment/app-client
```

### SSL not working (production)
```bash
# Check cert-manager
kubectl get certificates
kubectl describe certificate app-server-tls

# Common causes:
# - DNS not propagated (wait longer)
# - Port 80 blocked (check firewall)
# - Rate limited (use staging issuer first)
```

### Pod crashes
```bash
# Check logs
kubectl logs deployment/app-server

# Check events
kubectl describe pod <pod-name>

# Common causes:
# - Wrong secrets (check values.yaml)
# - Image pull error (check registry auth)
# - Resource limits too low (check values.yaml)
```

## Cost Optimization

**Local**: Free (just your laptop)

**Production (Vultr)**:
- 2 nodes: ~$48/month
- 5 nodes: ~$120/month
- Load balancer: ~$10/month

**Tips**:
1. Start with 2 nodes
2. Enable autoscaling for traffic spikes
3. Monitor actual usage
4. Scale down off-peak hours

## Security Checklist

- [ ] Never commit secrets to git
- [ ] Use strong, random JWT secrets
- [ ] Enable HTTPS in production
- [ ] Restrict allowed email addresses
- [ ] Keep Kubernetes updated
- [ ] Monitor cluster access logs
- [ ] Use network policies
- [ ] Implement rate limiting

## Getting Help

1. Check the detailed guides:
   - [Local Development](./terraform/environments/local/README.md)
   - [Production Deployment](./terraform/environments/production/README.md)

2. Common commands:
   ```bash
   kubectl get events --sort-by='.lastTimestamp'
   kubectl logs -f deployment/<name>
   kubectl describe pod <pod-name>
   ```

3. Useful resources:
   - [Kubernetes Docs](https://kubernetes.io/docs/)
   - [Helm Docs](https://helm.sh/docs/)
   - [Vultr VKE Docs](https://www.vultr.com/docs/vultr-kubernetes-engine/)

## Next Steps

After deployment:
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Configure backups
- [ ] Implement CI/CD pipeline
- [ ] Add logging aggregation
- [ ] Set up alerting
- [ ] Document runbooks
