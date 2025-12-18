#!/bin/bash
set -e

# Get repository root
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

echo "🚀 Deploying all services to local cluster..."
echo ""

# Configure Docker to use minikube's Docker daemon
echo "🐳 Configuring Docker for minikube..."
eval $(minikube docker-env)

# Deploy databases first
echo ""
echo "📦 Step 1/4: Deploying databases..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  🗄️  Deploying user-service-postgres..."
cd apps/@user/service
pnpm run deploy:postgres:local
cd "$REPO_ROOT"

echo ""
echo "✅ Databases deployed!"

# Wait for databases to be ready
echo ""
echo "⏳ Waiting for databases to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql --timeout=300s || true

# Build and deploy services
echo ""
echo "📦 Step 2/4: Building Docker images..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  🐳 Building api-service..."
cd apps/@api/service
pnpm run build:docker:local
cd "$REPO_ROOT"

echo "  🐳 Building user-service..."
cd apps/@user/service
pnpm run build:docker:local
cd "$REPO_ROOT"

echo "  🐳 Building www-web..."
cd apps/@www/web
pnpm run build:docker:local
cd "$REPO_ROOT"

echo "  🐳 Building app-web..."
cd apps/@app/web
pnpm run build:docker:local
cd "$REPO_ROOT"

echo ""
echo "✅ Docker images built!"

# Deploy services
echo ""
echo "📦 Step 3/4: Deploying services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  🚀 Deploying api-service..."
cd apps/@api/service
pnpm run deploy:helm:local
cd "$REPO_ROOT"

echo "  🚀 Deploying user-service..."
cd apps/@user/service
pnpm run deploy:helm:local
cd "$REPO_ROOT"

echo "  🚀 Deploying www-web..."
cd apps/@www/web
pnpm run deploy:helm:local
cd "$REPO_ROOT"

echo "  🚀 Deploying app-web..."
cd apps/@app/web
pnpm run deploy:helm:local
cd "$REPO_ROOT"

echo ""
echo "✅ Services deployed!"

# Wait for deployments
echo ""
echo "📦 Step 4/4: Waiting for deployments to be ready..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

kubectl wait --for=condition=available deployment/api-service --timeout=300s || true
kubectl wait --for=condition=available deployment/user-service --timeout=300s || true
kubectl wait --for=condition=available deployment/www-web --timeout=300s || true
kubectl wait --for=condition=available deployment/app-web --timeout=300s || true

# Display status
echo ""
echo "✅ All services deployed successfully!"
echo ""
echo "📊 Deployment Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
kubectl get pods
echo ""
echo "🌐 Services:"
kubectl get svc
echo ""
echo "🔗 Ingress:"
kubectl get ingress
echo ""
echo "Next steps:"
echo "  1. Port-forward databases: pnpm run cluster:port-forward"
echo "  2. Add to /etc/hosts: $(minikube ip) api.local.com app.local.com www.local.com"
echo "  3. Access services:"
echo "     - API: http://api.local.com"
echo "     - App: http://app.local.com"
echo "     - WWW: http://www.local.com"
