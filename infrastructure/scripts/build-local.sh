#!/bin/bash
set -e

echo "Building images for local minikube deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if minikube is running
if ! minikube status > /dev/null 2>&1; then
    echo -e "${RED}Error: Minikube is not running${NC}"
    echo "Start minikube with: minikube start"
    exit 1
fi

# Set docker env to use minikube's docker daemon
eval $(minikube docker-env)

# Build from repository root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo -e "${YELLOW}Building app-server image...${NC}"
docker build -t localhost:5000/app-server:latest \
    -f apps/@app/server/Dockerfile .

echo -e "${YELLOW}Building app-client image...${NC}"
docker build -t localhost:5000/app-client:latest \
    -f apps/@app/client/Dockerfile .

# Push to local registry (requires port-forward to be running)
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Pushing images to local registry...${NC}"
    docker push localhost:5000/app-server:latest
    docker push localhost:5000/app-client:latest
    echo -e "${GREEN}Images pushed successfully!${NC}"
else
    echo -e "${YELLOW}Warning: Local registry port-forward not detected${NC}"
    echo "Images are built in minikube's docker daemon"
    echo "They will be available with imagePullPolicy: Never"
fi

echo -e "${GREEN}Build complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Deploy with: ./scripts/deploy-local.sh"
echo "  2. Or use helm directly:"
echo "     helm upgrade --install app-server ./helm/charts/app-server -f ./helm/values/local.yaml"
echo "     helm upgrade --install app-client ./helm/charts/app-client -f ./helm/values/local.yaml"
