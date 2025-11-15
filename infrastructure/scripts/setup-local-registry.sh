#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up local registry for minikube...${NC}"

# Check if minikube is running
if ! minikube status > /dev/null 2>&1; then
    echo -e "${RED}Error: Minikube is not running${NC}"
    echo "Start minikube with: minikube start --cpus=4 --memory=8192"
    exit 1
fi

# Enable registry addon
echo -e "${YELLOW}Enabling registry addon...${NC}"
minikube addons enable registry

# Wait for registry pod to be ready
echo -e "${YELLOW}Waiting for registry pod to be ready...${NC}"
kubectl wait --for=condition=ready pod -l kubernetes.io/minikube-addons=registry -n kube-system --timeout=300s

# Get registry pod info
REGISTRY_POD=$(kubectl get pods -n kube-system -l kubernetes.io/minikube-addons=registry -o jsonpath='{.items[0].metadata.name}')
echo -e "${GREEN}Registry pod: ${REGISTRY_POD}${NC}"

# Check if port-forward is already running
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Port 5000 is already in use, killing existing process...${NC}"
    kill $(lsof -t -i:5000) 2>/dev/null || true
    sleep 2
fi

# Set up port-forward in background
echo -e "${YELLOW}Setting up port-forward to registry (localhost:5000)...${NC}"
kubectl port-forward -n kube-system service/registry 5000:80 > /dev/null 2>&1 &
PORT_FORWARD_PID=$!

# Wait for port-forward to be ready
echo -e "${YELLOW}Waiting for port-forward to be ready...${NC}"
for i in {1..30}; do
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

if ! lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}Failed to set up port-forward${NC}"
    exit 1
fi

echo -e "${GREEN}Local registry is ready at localhost:5000${NC}"
echo -e "${GREEN}Port-forward PID: ${PORT_FORWARD_PID}${NC}"
echo ""
echo "Registry setup complete! You can now:"
echo "  1. Build and push images: ./scripts/build-local.sh"
echo "  2. Deploy: ./scripts/deploy-local.sh"
echo ""
echo "Note: Keep this terminal open or the port-forward will stop."
echo "To run in background permanently, add to your startup scripts or use screen/tmux."
echo ""
echo "To stop the port-forward later:"
echo "  kill ${PORT_FORWARD_PID}"
echo "  # or: pkill -f 'port-forward.*registry'"
