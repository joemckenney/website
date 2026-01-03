#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Development Cluster Status ===${NC}"
echo ""

# Check minikube status
echo -e "${YELLOW}Cluster:${NC}"
if minikube status &> /dev/null; then
    MINIKUBE_IP=$(minikube ip 2>/dev/null || echo "unknown")
    CONTEXT=$(kubectl config current-context 2>/dev/null || echo "unknown")
    echo -e "  ${GREEN}✓${NC} Running"
    echo "  IP:      $MINIKUBE_IP"
    echo "  Context: $CONTEXT"
else
    echo -e "  ${RED}✗${NC} Not running"
    echo ""
    echo "Start with: pnpm run dev:start"
    exit 0
fi

# Check registry port-forward
echo ""
echo -e "${YELLOW}Registry Port-Forward:${NC}"
REGISTRY_PID_FILE="/tmp/minikube-registry-forward.pid"
if [ -f "$REGISTRY_PID_FILE" ]; then
    PID=$(cat "$REGISTRY_PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Running (PID: $PID)"
        echo "  Endpoint: localhost:5000"
    else
        echo -e "  ${RED}✗${NC} Not running (stale PID file)"
        echo "  Run 'pnpm run dev:start' to restart"
    fi
else
    echo -e "  ${RED}✗${NC} Not running"
    echo "  Run 'pnpm run dev:start' to start"
fi

# Check deployed applications
echo ""
echo -e "${YELLOW}Deployed Applications:${NC}"

# Check for helm releases
RELEASES=$(helm list -q 2>/dev/null || echo "")
if [ -z "$RELEASES" ]; then
    echo "  No applications deployed"
else
    for release in $RELEASES; do
        STATUS=$(helm status "$release" -o json 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$STATUS" = "deployed" ]; then
            echo -e "  ${GREEN}✓${NC} $release"
        else
            echo -e "  ${YELLOW}⚠${NC} $release ($STATUS)"
        fi
    done
fi

# Check pods
echo ""
echo -e "${YELLOW}Pods:${NC}"
kubectl get pods --all-namespaces \
    --field-selector=metadata.namespace!=kube-system,metadata.namespace!=ingress-nginx \
    --no-headers 2>/dev/null | while read -r line; do
    NAMESPACE=$(echo "$line" | awk '{print $1}')
    POD=$(echo "$line" | awk '{print $2}')
    STATUS=$(echo "$line" | awk '{print $4}')

    if [ "$STATUS" = "Running" ]; then
        echo -e "  ${GREEN}✓${NC} $NAMESPACE/$POD"
    else
        echo -e "  ${YELLOW}⚠${NC} $NAMESPACE/$POD ($STATUS)"
    fi
done

# Show ingress information
echo ""
echo -e "${YELLOW}Ingresses:${NC}"
INGRESSES=$(kubectl get ingress --all-namespaces --no-headers 2>/dev/null || echo "")
if [ -z "$INGRESSES" ]; then
    echo "  No ingresses configured"
else
    echo "$INGRESSES" | while read -r line; do
        NAMESPACE=$(echo "$line" | awk '{print $1}')
        NAME=$(echo "$line" | awk '{print $2}')
        HOSTS=$(echo "$line" | awk '{print $4}')
        echo "  • $NAMESPACE/$NAME"
        echo "    Hosts: $HOSTS"
    done
fi

echo ""
echo -e "${BLUE}Helpful commands:${NC}"
echo "  pnpm run dev:start    - Start cluster and registry"
echo "  pnpm run dev:stop     - Stop cluster"
echo "  kubectl get pods -A   - List all pods"
echo "  kubectl logs <pod>    - View pod logs"
echo "  helm list            - List deployments"
echo ""
