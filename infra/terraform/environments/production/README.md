# Production Deployment on Vultr VKE

This guide covers deploying the applications to a production Kubernetes cluster on Vultr.

## Prerequisites

- Vultr account with API access
- Terraform installed (>= 1.0)
- kubectl installed
- Helm installed
- Container registry (DigitalOcean, Docker Hub, or GitHub Container Registry)
- Domain name with DNS access

## Initial Setup

### 1. Create Vultr API Key

1. Go to https://my.vultr.com/settings/#settingsapi
2. Click "Enable API"
3. Copy your API key

### 2. Configure Terraform Variables

```bash
cd infrastructure/terraform/environments/production

# Copy example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
vim terraform.tfvars
```

Required variables:
```hcl
vultr_api_key       = "YOUR_VULTR_API_KEY"
cluster_name        = "app-production"
region              = "ewr"  # See: https://api.vultr.com/v2/regions
letsencrypt_email   = "your@email.com"
```

### 3. Create Infrastructure

```bash
# Initialize Terraform
terraform init

# Review planned changes
terraform plan

# Create infrastructure
terraform apply

# Save kubeconfig
terraform output -raw kubeconfig > ~/.kube/config-vultr
export KUBECONFIG=~/.kube/config-vultr
```

This creates:
- VKE Kubernetes cluster (2-5 nodes with autoscaling)
- Firewall rules
- Nginx Ingress Controller
- Cert-Manager for SSL certificates
- Let's Encrypt ClusterIssuer

### 4. Verify Cluster

```bash
# Test connection
kubectl cluster-info
kubectl get nodes

# Wait for nginx ingress to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# Wait for cert-manager
kubectl wait --namespace cert-manager \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/instance=cert-manager \
  --timeout=120s
```

### 5. Get Load Balancer IP

```bash
# Get external IP (may take a few minutes)
kubectl get svc -n ingress-nginx ingress-nginx-controller

# Or watch until EXTERNAL-IP appears
kubectl get svc -n ingress-nginx -w
```

### 6. Configure DNS

Point your domain to the load balancer IP:

```
# A records
api.yourdomain.com     → <LOAD_BALANCER_IP>
client.yourdomain.com  → <LOAD_BALANCER_IP>
```

Wait for DNS propagation (can take up to 48 hours, usually < 1 hour):

```bash
# Test DNS
dig api.yourdomain.com
dig client.yourdomain.com
```

### 7. Configure Container Registry

Choose a container registry:

**Option A: DigitalOcean Container Registry** (Recommended)

```bash
# Create registry at: https://cloud.digitalocean.com/registry
# Install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/

# Authenticate
doctl registry login

# Update image repositories in production.yaml
vim ../../helm/values/production.yaml

# Change to:
# repository: registry.digitalocean.com/your-registry/app-server
# repository: registry.digitalocean.com/your-registry/app-client
```

**Option B: Docker Hub**

```bash
# Login
docker login

# Update production.yaml to use:
# repository: yourusername/app-server
# repository: yourusername/app-client
```

### 8. Build and Push Production Images

```bash
cd ../../../../  # Back to repo root

# Build server
docker build -t registry.digitalocean.com/your-registry/app-server:latest \
  -f apps/@app/server/Dockerfile .
docker push registry.digitalocean.com/your-registry/app-server:latest

# Build client
docker build -t registry.digitalocean.com/your-registry/app-client:latest \
  -f apps/@app/client/Dockerfile .
docker push registry.digitalocean.com/your-registry/app-client:latest
```

Or use the helper script:

```bash
cd infrastructure
./scripts/build-production.sh
```

### 9. Configure Application Secrets

Edit `infrastructure/helm/values/production.yaml`:

```yaml
app-server:
  image:
    repository: registry.digitalocean.com/your-registry/app-server

  ingress:
    hosts:
      - host: api.yourdomain.com

  secrets:
    googleClientId: "your-google-oauth-client-id"
    googleClientSecret: "your-google-oauth-client-secret"
    jwtSecret: "generate-strong-random-secret"
    allowedEmail: "your@email.com"
    frontendUrl: "https://client.yourdomain.com"
    backendUrl: "https://api.yourdomain.com"

app-client:
  image:
    repository: registry.digitalocean.com/your-registry/app-client

  ingress:
    hosts:
      - host: client.yourdomain.com
```

### 10. Deploy Applications

```bash
cd infrastructure

# Deploy server
helm upgrade --install app-server \
  ./helm/charts/app-server \
  -f ./helm/values/production.yaml \
  --timeout=5m

# Deploy client
helm upgrade --install app-client \
  ./helm/charts/app-client \
  -f ./helm/values/production.yaml \
  --timeout=5m
```

Or use the helper script:

```bash
./scripts/deploy-production.sh
```

### 11. Verify Deployment

```bash
# Check pods
kubectl get pods

# Check ingress
kubectl get ingress

# Check certificates (takes 1-2 minutes)
kubectl get certificates
kubectl describe certificate app-server-tls
kubectl describe certificate app-client-tls

# View logs
kubectl logs -f deployment/app-server
kubectl logs -f deployment/app-client
```

### 12. Test Application

```bash
# Test API
curl https://api.yourdomain.com/ping

# Open in browser
open https://client.yourdomain.com
```

## Maintenance

### Updating Applications

```bash
# Build and push new images
./scripts/build-production.sh

# Upgrade Helm releases
helm upgrade app-server ./helm/charts/app-server -f ./helm/values/production.yaml
helm upgrade app-client ./helm/charts/app-client -f ./helm/values/production.yaml

# Or force rollout
kubectl rollout restart deployment/app-server
kubectl rollout restart deployment/app-client
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment app-server --replicas=5

# Autoscaling is enabled by default in production.yaml
# Configure in values:
# autoscaling:
#   enabled: true
#   minReplicas: 2
#   maxReplicas: 10
```

### Monitoring

```bash
# Resource usage
kubectl top nodes
kubectl top pods

# Logs
kubectl logs -f deployment/app-server --tail=100
kubectl logs -f deployment/app-client --tail=100

# Events
kubectl get events --sort-by='.lastTimestamp'
```

### Backup

```bash
# Backup Helm values
cp helm/values/production.yaml helm/values/production.yaml.backup

# Backup Terraform state (if using local state)
cp terraform/environments/production/terraform.tfstate terraform.tfstate.backup

# Export all Kubernetes resources
kubectl get all -o yaml > k8s-backup.yaml
```

## Troubleshooting

### Certificate Not Issuing

```bash
# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Check certificate status
kubectl describe certificate app-server-tls

# Check challenge
kubectl get challenges
kubectl describe challenge <challenge-name>

# Common issues:
# - DNS not propagated: Wait longer
# - Port 80 blocked: Check firewall rules
# - Rate limit: Let's Encrypt has rate limits, use staging first
```

### Pods Not Starting

```bash
# Check events
kubectl describe pod <pod-name>

# Check image pull
# Ensure you're logged into container registry
doctl registry login  # or docker login

# Create image pull secret if needed
kubectl create secret docker-registry regcred \
  --docker-server=registry.digitalocean.com \
  --docker-username=<token> \
  --docker-password=<token>

# Add to values.yaml:
# imagePullSecrets:
#   - name: regcred
```

### Ingress Not Working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl describe ingress app-server

# Check service
kubectl get svc

# Test from pod
kubectl run test --rm -it --image=curlimages/curl -- sh
# curl http://app-server:3000/ping
```

### High Costs

```bash
# Check node utilization
kubectl top nodes

# Scale down if over-provisioned
# Update terraform.tfvars:
# node_count = 2
# max_nodes = 3

terraform apply

# Disable autoscaling if not needed
# Update production.yaml:
# autoscaling:
#   enabled: false
```

## Security Best Practices

1. **Secrets Management**:
   - Never commit real secrets to git
   - Use external secret manager (Vault, Sealed Secrets)
   - Rotate secrets regularly

2. **Network Security**:
   - Enable firewall rules (included in Terraform)
   - Use Network Policies for pod-to-pod communication
   - Implement rate limiting in ingress

3. **Access Control**:
   - Use RBAC for cluster access
   - Audit cluster access logs
   - Implement pod security policies

4. **Updates**:
   - Keep Kubernetes version updated
   - Update application dependencies
   - Monitor CVE databases

## Disaster Recovery

### Cluster Failure

```bash
# Recreate from Terraform
cd terraform/environments/production
terraform apply

# Restore applications
cd ../../../
./scripts/deploy-production.sh
```

### Data Loss Prevention

1. Export secrets to secure location
2. Backup Helm values files
3. Use remote Terraform state (S3, Terraform Cloud)
4. Document all manual configuration changes

## Cost Optimization

Current monthly costs (estimated):
- 2 worker nodes (vc2-2c-4gb): ~$48
- Load balancer: ~$10
- Data transfer: ~$0-20
- **Total**: ~$58-78/month

Optimization tips:
1. Use smaller node sizes if workload allows
2. Implement aggressive autoscaling policies
3. Use reserved instances for predictable workloads
4. Monitor and remove unused resources

## Cleanup

```bash
# Delete Helm releases
helm uninstall app-server
helm uninstall app-client

# Destroy infrastructure
cd terraform/environments/production
terraform destroy

# Clean up DNS records
# Remove A records for api.yourdomain.com and client.yourdomain.com
```

## Next Steps

- Set up monitoring (Prometheus + Grafana)
- Implement logging (Loki or ELK)
- Add CI/CD pipeline
- Implement backup strategy
- Set up alerting
