#!/bin/bash
set -e

echo "Deploying applications to production..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"

# Check kubectl context
CURRENT_CONTEXT=$(kubectl config current-context)
echo -e "${YELLOW}Current kubectl context: $CURRENT_CONTEXT${NC}"

if [[ "$CURRENT_CONTEXT" == "minikube" ]]; then
    echo -e "${RED}Error: Cannot deploy to production from minikube context${NC}"
    exit 1
fi

read -p "Deploy to production cluster? (yes/NO) " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

cd "$INFRA_DIR"

echo -e "${YELLOW}Deploying app-server...${NC}"
helm upgrade --install app-server \
    ./helm/charts/app-server \
    -f ./helm/values/production.yaml \
    --wait \
    --timeout=10m

echo -e "${YELLOW}Deploying app-client...${NC}"
helm upgrade --install app-client \
    ./helm/charts/app-client \
    -f ./helm/values/production.yaml \
    --wait \
    --timeout=10m

echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Verify deployment:"
echo "  kubectl get pods"
echo "  kubectl get ingress"
echo "  kubectl get certificates"
echo ""
echo "View logs:"
echo "  kubectl logs -f deployment/app-server"
echo "  kubectl logs -f deployment/app-client"
