#!/bin/bash
set -e

echo "🗑️  Tearing down local Kubernetes cluster..."

# Check if minikube is installed
if ! command -v minikube &> /dev/null; then
    echo "❌ minikube is not installed"
    exit 1
fi

# Ask for confirmation
read -p "⚠️  This will delete the entire minikube cluster. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Stop minikube
echo "🛑 Stopping minikube..."
minikube stop || true

# Delete minikube
echo "🗑️  Deleting minikube cluster..."
minikube delete

echo ""
echo "✅ Local cluster has been removed"
echo ""
echo "To recreate the cluster, run:"
echo "  pnpm run cluster:setup"
