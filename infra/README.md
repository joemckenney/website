# Infrastructure Setup

This directory contains Infrastructure as Code (IaC) for deploying the @app/client and @app/server applications to Kubernetes.

## Directory Structure

```
infrastructure/
├── terraform/              # Terraform configurations
│   ├── modules/
│   │   └── vultr-vke/     # Vultr Kubernetes Engine module
│   └── environments/
│       ├── local/         # Local environment (docs only, minikube doesn't need Terraform)
│       └── production/    # Production environment on Vultr
├── helm/                  # Helm charts and values
│   ├── charts/
│   │   ├── app-server/   # Server Helm chart
│   │   └── app-client/   # Client Helm chart
│   └── values/
│       ├── local.yaml    # Local minikube values
│       └── production.yaml # Production values
└── scripts/              # Helper scripts for deployment
```

## Prerequisites

### Common Requirements
- [kubectl](https://kubernetes.io/docs/tasks/tools/) - Kubernetes CLI
- [Helm](https://helm.sh/docs/intro/install/) - Kubernetes package manager
- [Docker](https://docs.docker.com/get-docker/) - Container runtime

### Local Development
- [Minikube](https://minikube.sigs.k8s.io/docs/start/) - Local Kubernetes cluster
- [Minikube Registry](https://minikube.sigs.k8s.io/docs/handbook/registry/) - Local container registry

### Production Deployment
- [Terraform](https://www.terraform.io/downloads) - Infrastructure provisioning
- [Vultr Account](https://www.vultr.com/) - Cloud provider
- [Vultr API Key](https://my.vultr.com/settings/#settingsapi) - API access

## Quick Start

### Local Development (Minikube)

See [Local Development Setup](./terraform/environments/local/README.md) for detailed instructions.

```bash
# 1. Start minikube
minikube start

# 2. Enable ingress
minikube addons enable ingress

# 3. Enable local registry
minikube addons enable registry

# 4. Build and push images
./scripts/build-local.sh

# 5. Deploy with Helm
./scripts/deploy-local.sh
```

### Production Deployment (Vultr)

See [Production Deployment Guide](./terraform/environments/production/README.md) for detailed instructions.

```bash
# 1. Create infrastructure with Terraform
cd terraform/environments/production
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
terraform plan
terraform apply

# 2. Build and push images to container registry
./scripts/build-production.sh

# 3. Deploy with Helm
./scripts/deploy-production.sh
```

## Architecture

### Components

1. **app-server**: Fastify Node.js API server
   - Handles authentication (Google OAuth)
   - Provides REST API endpoints
   - JWT token management with httpOnly cookies

2. **app-client**: React SPA served with nginx
   - Authentication UI
   - API consumption via generated SDK

3. **Infrastructure**:
   - Kubernetes cluster (Minikube locally, VKE on Vultr)
   - Nginx Ingress Controller
   - Cert-Manager (production only, Let's Encrypt SSL)

### Data Flow

```
User → Ingress → app-client (nginx) → app-server (Fastify) → External APIs
                    ↓                        ↓
                 Static Files           Authentication
                                        Business Logic
```

## Environment Configuration

### Local (Minikube)

- Domain: `*.local.com` (add to /etc/hosts)
- No TLS (HTTP only)
- Single replica
- Lower resource limits
- Local container registry

### Production (Vultr)

- Domain: Your custom domain
- TLS via Let's Encrypt
- Multiple replicas
- Autoscaling enabled
- Production container registry (e.g., DigitalOcean, Docker Hub)

## Secrets Management

**WARNING**: Never commit secrets to version control!

### Local Secrets

Update `infrastructure/helm/values/local.yaml` with local development values.

### Production Secrets

1. Copy `terraform/environments/production/terraform.tfvars.example` to `terraform.tfvars`
2. Fill in your Vultr API key and other values
3. Update `infrastructure/helm/values/production.yaml` with your secrets
4. Consider using external secret management:
   - [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
   - [External Secrets Operator](https://external-secrets.io/)
   - [Vault](https://www.vaultproject.io/)

## Maintenance

### Updating Applications

```bash
# Build new images
./scripts/build-<environment>.sh

# Upgrade Helm releases
helm upgrade app-server ./helm/charts/app-server -f ./helm/values/<environment>.yaml
helm upgrade app-client ./helm/charts/app-client -f ./helm/values/<environment>.yaml
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment app-server --replicas=3

# Or update values.yaml and helm upgrade
```

### Monitoring

```bash
# Check pod status
kubectl get pods

# View logs
kubectl logs -f deployment/app-server
kubectl logs -f deployment/app-client

# Describe resources
kubectl describe pod <pod-name>
```

## Troubleshooting

See individual README files for environment-specific troubleshooting:
- [Local Troubleshooting](./terraform/environments/local/README.md#troubleshooting)
- [Production Troubleshooting](./terraform/environments/production/README.md#troubleshooting)

## Cost Estimation (Production)

Vultr VKE pricing (as of 2024):
- Control plane: Free
- Worker nodes: ~$24/month per node (vc2-2c-4gb plan)
- Minimum cost: ~$48/month (2 nodes)
- With autoscaling (2-5 nodes): ~$48-120/month

Load balancer: ~$10/month

**Estimated total**: $58-130/month depending on load

## Support

For issues:
1. Check the troubleshooting guides
2. Review Kubernetes events: `kubectl get events`
3. Check application logs: `kubectl logs`
4. Consult the [Kubernetes documentation](https://kubernetes.io/docs/)
