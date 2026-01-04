#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Development Cluster ===${NC}"
echo ""

# Check if minikube is running
echo -e "${YELLOW}Checking cluster status...${NC}"
if ! minikube status &> /dev/null; then
    echo -e "${YELLOW}Cluster is not running. Starting minikube...${NC}"
    minikube start
    echo -e "${GREEN}✓ Cluster started${NC}"
else
    echo -e "${GREEN}✓ Cluster already running${NC}"
fi

# Ensure registry addon is enabled
echo ""
echo -e "${YELLOW}Checking registry addon...${NC}"
if minikube addons list | grep -q "registry.*enabled"; then
    echo -e "${GREEN}✓ Registry addon already enabled${NC}"
else
    echo -e "${YELLOW}Enabling registry addon...${NC}"
    minikube addons enable registry
    echo -e "${GREEN}✓ Registry addon enabled${NC}"
fi

# Check if port-forward is already running
REGISTRY_PID_FILE="/tmp/minikube-registry-forward.pid"

if [ -f "$REGISTRY_PID_FILE" ]; then
    OLD_PID=$(cat "$REGISTRY_PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓ Registry port-forward already running (PID: $OLD_PID)${NC}"
    else
        # PID file exists but process is dead, clean it up
        rm -f "$REGISTRY_PID_FILE"
    fi
fi

# Start port-forward if not already running
if [ ! -f "$REGISTRY_PID_FILE" ]; then
    echo ""
    echo -e "${YELLOW}Starting registry port-forward...${NC}"

    # Wait for registry pod to be ready
    echo "Waiting for registry pod..."
    kubectl wait --namespace kube-system \
        --for=condition=ready pod \
        --selector=actual-registry=true \
        --timeout=60s 2>/dev/null || true

    # Find the registry pod
    REGISTRY_POD=$(kubectl get pods -n kube-system -l actual-registry=true -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [ -z "$REGISTRY_POD" ]; then
        echo -e "${RED}Warning: Could not find registry pod${NC}"
        echo "Registry may not be available yet. Try running this script again in a moment."
    else
        # Start port-forward in background
        nohup kubectl port-forward -n kube-system "$REGISTRY_POD" 5000:5000 > /tmp/registry-forward.log 2>&1 &
        FORWARD_PID=$!

        # Save PID
        echo "$FORWARD_PID" > "$REGISTRY_PID_FILE"

        # Give it a moment to start
        sleep 2

        # Verify it's still running
        if ps -p "$FORWARD_PID" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Registry port-forward started (PID: $FORWARD_PID)${NC}"
            echo "  Local registry available at: localhost:5000"
        else
            echo -e "${RED}Failed to start port-forward${NC}"
            rm -f "$REGISTRY_PID_FILE"
        fi
    fi
fi

echo ""
echo -e "${GREEN}=== Cluster Ready ===${NC}"
echo ""
echo "Cluster Information:"
echo "  IP:      $(minikube ip)"
echo "  Context: $(kubectl config current-context)"
echo "  Registry: localhost:5000"
echo ""
echo "Next steps:"
echo "  1. Build images:    pnpm run build:local"
echo "  2. Deploy apps:     pnpm run deploy:local"
echo "  3. Check status:    pnpm run dev:status"
echo "  4. Stop cluster:    pnpm run dev:stop"
echo ""
