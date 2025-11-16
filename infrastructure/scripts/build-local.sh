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

# Build from repository root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo -e "${YELLOW}Building all Docker images using Turbo...${NC}"
pnpm turbo run build:docker:local

echo -e "${GREEN}Build complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Deploy with Turbo:"
echo "     pnpm turbo run deploy:helm:local"
echo ""
echo "  2. Or deploy individually:"
echo "     cd apps/@api/app && pnpm run deploy:helm:local"
echo "     cd apps/@app/app && pnpm run deploy:helm:local"
echo "     cd apps/@www/app && pnpm run deploy:helm:local"
echo ""
echo "  3. Access the apps:"
echo "     http://www.local.com - Weather sonification app"
echo "     http://app.local.com - Demo client app"
echo "     http://api.local.com - API server"
