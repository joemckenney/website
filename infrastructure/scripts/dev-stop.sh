#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Stopping Development Cluster ===${NC}"
echo ""

# Stop registry port-forward
REGISTRY_PID_FILE="/tmp/minikube-registry-forward.pid"

if [ -f "$REGISTRY_PID_FILE" ]; then
    PID=$(cat "$REGISTRY_PID_FILE")
    echo -e "${YELLOW}Stopping registry port-forward (PID: $PID)...${NC}"

    if ps -p "$PID" > /dev/null 2>&1; then
        kill "$PID" 2>/dev/null || true
        echo -e "${GREEN}✓ Port-forward stopped${NC}"
    else
        echo -e "${YELLOW}Port-forward was not running${NC}"
    fi

    rm -f "$REGISTRY_PID_FILE"
else
    echo -e "${YELLOW}No registry port-forward PID file found${NC}"
fi

# Stop minikube
echo ""
echo -e "${YELLOW}Stopping minikube cluster...${NC}"

if minikube status &> /dev/null; then
    minikube stop
    echo -e "${GREEN}✓ Cluster stopped${NC}"
else
    echo -e "${YELLOW}Cluster was not running${NC}"
fi

echo ""
echo -e "${GREEN}=== Cluster Stopped ===${NC}"
echo ""
echo "To start again: pnpm run dev:start"
echo ""
