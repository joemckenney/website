#!/bin/bash
set -e

echo "Deploying applications to local minikube..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"

# Check kubectl context
CURRENT_CONTEXT=$(kubectl config current-context)
if [[ "$CURRENT_CONTEXT" != "minikube" ]]; then
    echo -e "${YELLOW}Warning: Current context is not 'minikube' (current: $CURRENT_CONTEXT)${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

cd "$INFRA_DIR"

echo -e "${YELLOW}Deploying app-server...${NC}"
helm upgrade --install app-server \
    ./helm/charts/app-server \
    -f ./helm/values/local.yaml \
    --wait \
    --timeout=5m

echo -e "${YELLOW}Deploying app-client...${NC}"
helm upgrade --install app-client \
    ./helm/charts/app-client \
    -f ./helm/values/local.yaml \
    --wait \
    --timeout=5m

echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Access your applications:"
echo "  Client: http://client.local.test"
echo "  API:    http://api.local.test"
echo "  Docs:   http://api.local.test/docs"
echo ""
echo "Useful commands:"
echo "  kubectl get pods                    # Check pod status"
echo "  kubectl logs -f deployment/app-server  # View server logs"
echo "  kubectl logs -f deployment/app-client  # View client logs"
