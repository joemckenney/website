#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Development Cluster Setup ===${NC}"
echo ""

# Check for required tools
echo -e "${YELLOW}Checking prerequisites...${NC}"

MISSING_TOOLS=()

if ! command -v minikube &> /dev/null; then
    MISSING_TOOLS+=("minikube")
fi

if ! command -v kubectl &> /dev/null; then
    MISSING_TOOLS+=("kubectl")
fi

if ! command -v helm &> /dev/null; then
    MISSING_TOOLS+=("helm")
fi

if ! command -v docker &> /dev/null; then
    MISSING_TOOLS+=("docker")
fi

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    echo -e "${RED}Missing required tools: ${MISSING_TOOLS[*]}${NC}"
    echo ""
    echo "Install them with:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "  brew install minikube kubectl helm docker"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "  # Ubuntu/Debian:"
        echo "  sudo apt-get update"
        echo "  sudo apt-get install -y docker.io"
        echo "  # Install minikube: https://minikube.sigs.k8s.io/docs/start/"
        echo "  # Install kubectl: https://kubernetes.io/docs/tasks/tools/"
        echo "  # Install helm: https://helm.sh/docs/intro/install/"
    fi
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites installed${NC}"
echo ""

# Check if minikube cluster already exists
if minikube status &> /dev/null; then
    echo -e "${YELLOW}Minikube cluster already exists.${NC}"
    read -p "Delete and recreate? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deleting existing cluster...${NC}"
        minikube delete
    else
        echo -e "${GREEN}Using existing cluster${NC}"
        echo ""
        echo "Next steps:"
        echo "  pnpm run dev:start    # Start cluster and registry"
        exit 0
    fi
fi

# Create minikube cluster
echo -e "${YELLOW}Creating minikube cluster...${NC}"
minikube start --cpus=4 --memory=8192 --driver=docker

# Enable required addons
echo -e "${YELLOW}Checking ingress addon...${NC}"
if minikube addons list | grep -q "ingress.*enabled"; then
    echo -e "${GREEN}✓ Ingress addon already enabled${NC}"
else
    echo "Enabling ingress (this may take a few minutes)..."
    minikube addons enable ingress &
    INGRESS_PID=$!

    # Wait with timeout
    TIMEOUT=180
    ELAPSED=0
    while kill -0 $INGRESS_PID 2>/dev/null && [ $ELAPSED -lt $TIMEOUT ]; do
        sleep 5
        ELAPSED=$((ELAPSED + 5))
        echo -n "."
    done
    echo ""

    if kill -0 $INGRESS_PID 2>/dev/null; then
        echo -e "${YELLOW}⚠ Ingress enable still in progress, continuing in background...${NC}"
    else
        echo -e "${GREEN}✓ Ingress addon enabled${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}Checking registry addon...${NC}"
if minikube addons list | grep -q "registry.*enabled"; then
    echo -e "${GREEN}✓ Registry addon already enabled${NC}"
else
    echo "Enabling registry..."
    minikube addons enable registry
    echo -e "${GREEN}✓ Registry addon enabled${NC}"
fi

# Wait for ingress to be ready (with longer timeout for image pull)
echo ""
echo -e "${YELLOW}Waiting for ingress controller to be ready...${NC}"
echo "This may take several minutes on first setup (downloading ~350MB image)"

if kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=600s 2>/dev/null; then
    echo -e "${GREEN}✓ Ingress controller ready${NC}"
else
    echo -e "${YELLOW}⚠ Ingress controller not ready yet${NC}"
    echo "Check progress with: kubectl get pods -n ingress-nginx"
    echo "Check status later with: pnpm run dev:status"
fi

# Configure /etc/hosts
MINIKUBE_IP=$(minikube ip)
HOSTS_ENTRY="$MINIKUBE_IP www.local.com app.local.com api.local.com"

echo ""
echo -e "${YELLOW}Configuring local DNS...${NC}"
echo "Adding to /etc/hosts: $HOSTS_ENTRY"

if grep -q "www.local.com" /etc/hosts 2>/dev/null; then
    echo -e "${YELLOW}Entries already exist in /etc/hosts${NC}"
    echo "You may need to update them manually if the IP changed:"
    echo "  sudo sed -i '' '/www.local.com/d' /etc/hosts  # macOS"
    echo "  sudo sed -i '/www.local.com/d' /etc/hosts     # Linux"
    echo "  echo '$HOSTS_ENTRY' | sudo tee -a /etc/hosts"
else
    echo "Requires sudo to modify /etc/hosts..."
    echo "$HOSTS_ENTRY" | sudo tee -a /etc/hosts
    echo -e "${GREEN}✓ DNS configured${NC}"
fi

echo ""
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo ""
echo "Cluster Information:"
echo "  IP:      $MINIKUBE_IP"
echo "  Context: $(kubectl config current-context)"
echo ""
echo "Next steps:"
echo "  1. Start the cluster:    pnpm run dev:start"
echo "  2. Build images:         pnpm run build:local"
echo "  3. Deploy apps:          pnpm run deploy:local"
echo "  4. Check status:         pnpm run dev:status"
echo ""
