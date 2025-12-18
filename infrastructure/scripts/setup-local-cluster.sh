#!/bin/bash
set -e

echo "🚀 Setting up local Kubernetes cluster..."

# Check if minikube is installed
if ! command -v minikube &> /dev/null; then
    echo "❌ minikube is not installed. Please install it first:"
    echo "   https://minikube.sigs.k8s.io/docs/start/"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install it first:"
    echo "   https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Check if helm is installed
if ! command -v helm &> /dev/null; then
    echo "❌ helm is not installed. Please install it first:"
    echo "   https://helm.sh/docs/intro/install/"
    exit 1
fi

# Start minikube if not running
if ! minikube status &> /dev/null; then
    echo "📦 Starting minikube cluster..."
    minikube start --driver=docker --cpus=4 --memory=8192 --disk-size=50g
else
    echo "✅ minikube is already running"
fi

# Enable required addons
echo "🔧 Enabling minikube addons..."
minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable registry

# Configure kubectl context
echo "⚙️  Configuring kubectl context..."
kubectl config use-context minikube

# Add Helm repos
echo "📚 Adding Helm repositories..."
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Create namespace if it doesn't exist
echo "📂 Setting up namespaces..."
kubectl create namespace default --dry-run=client -o yaml | kubectl apply -f -

# Display cluster info
echo ""
echo "✅ Local cluster is ready!"
echo ""
echo "📊 Cluster Info:"
kubectl cluster-info
echo ""
echo "🖥️  Nodes:"
kubectl get nodes
echo ""
echo "📦 Addons:"
minikube addons list | grep enabled
echo ""
echo "🌐 Minikube IP: $(minikube ip)"
echo ""
echo "Next steps:"
echo "  1. Deploy services: pnpm run cluster:deploy"
echo "  2. Port-forward databases: pnpm run cluster:port-forward"
echo "  3. Access apps at:"
echo "     - API: http://api.local.com (add to /etc/hosts)"
echo "     - App: http://app.local.com"
echo "     - WWW: http://www.local.com"
