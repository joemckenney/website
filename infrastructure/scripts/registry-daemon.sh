#!/bin/bash

# This script keeps the registry port-forward running persistently
# Run it with: ./scripts/registry-daemon.sh
# Or run in background: nohup ./scripts/registry-daemon.sh > /tmp/registry-daemon.log 2>&1 &

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting registry port-forward daemon...${NC}"

while true; do
    # Check if minikube is running
    if ! minikube status > /dev/null 2>&1; then
        echo -e "${YELLOW}[$(date)] Waiting for minikube to start...${NC}"
        sleep 10
        continue
    fi

    # Check if registry addon is enabled
    if ! minikube addons list | grep -q "registry.*enabled"; then
        echo -e "${YELLOW}[$(date)] Enabling registry addon...${NC}"
        minikube addons enable registry
        sleep 5
    fi

    # Wait for registry pod to be ready
    kubectl wait --for=condition=ready pod -l kubernetes.io/minikube-addons=registry -n kube-system --timeout=30s > /dev/null 2>&1

    if ! lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}[$(date)] Starting port-forward to registry...${NC}"
        kubectl port-forward -n kube-system service/registry 5000:80 2>&1 | \
            while IFS= read -r line; do
                echo "[$(date)] $line"
            done

        echo -e "${YELLOW}[$(date)] Port-forward stopped, restarting in 5 seconds...${NC}"
        sleep 5
    else
        sleep 5
    fi
done
