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
    -f ./helm/values/app-server-local.yaml \
    --wait \
    --timeout=5m

echo -e "${YELLOW}Deploying app-client...${NC}"
helm upgrade --install app-client \
    ./helm/charts/app-client \
    -f ./helm/values/app-client-local.yaml \
    --wait \
    --timeout=5m

echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Access your applications:"
echo "  WWW:    http://www.local.com"
echo "  App:    http://app.local.com"
echo "  API:    http://api.local.com"
echo "  Docs:   http://api.local.com/docs"
echo ""
echo "Useful commands:"
echo "  kubectl get pods                 # Check pod status"
echo "  stern app-server                 # View server logs"
echo "  stern app-client                 # View client logs"
echo "  stern 'app-'                     # View all app logs"
echo ""
echo -e "${YELLOW}Tailing application logs (Ctrl+C to exit)...${NC}"
stern 'app-'
