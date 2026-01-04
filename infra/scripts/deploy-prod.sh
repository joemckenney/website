#!/bin/bash
set -e

echo "Deploying applications to Vultr Kubernetes..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Check kubectl context (safety check)
CURRENT_CONTEXT=$(kubectl config current-context)
echo -e "${YELLOW}Current kubectl context: $CURRENT_CONTEXT${NC}"
if [[ "$CURRENT_CONTEXT" == "minikube" ]]; then
    echo -e "${YELLOW}Warning: Current context is 'minikube', not production!${NC}"
    read -p "Are you sure you want to deploy to minikube? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

cd "$REPO_ROOT"

echo -e "${YELLOW}Deploying all apps using Turbo...${NC}"
pnpm turbo run deploy:helm:prod

echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Verify deployment:"
echo "  kubectl get pods"
echo "  kubectl get ingress"
echo "  kubectl get certificate"
echo ""
echo "Check your applications:"
echo "  https://www.joemckenney.com"
echo "  https://app.joemckenney.com"
echo "  https://api.joemckenney.com"
echo ""
echo "Useful commands:"
echo "  kubectl logs -f POD_NAME                  # View logs"
echo "  kubectl describe certificate CERT_NAME    # Check certificate status"
echo "  kubectl describe ingress INGRESS_NAME     # Check ingress status"
