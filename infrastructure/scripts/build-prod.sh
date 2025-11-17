#!/bin/bash
set -e

echo "Building Docker images for production..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check required environment variables
if [ -z "$DOCKERHUB_USERNAME" ]; then
    echo -e "${RED}Error: DOCKERHUB_USERNAME environment variable not set${NC}"
    echo "Set it with: export DOCKERHUB_USERNAME=your-username"
    exit 1
fi

# Check if logged into Docker Hub
if ! docker info | grep -q "Username"; then
    echo -e "${YELLOW}Warning: Not logged into Docker Hub${NC}"
    echo "Login with: docker login"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get script directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo -e "${YELLOW}Building all Docker images for production...${NC}"
pnpm turbo run build:docker:prod

echo -e "${GREEN}Build complete!${NC}"
echo ""
echo "Images built:"
echo "  ${DOCKERHUB_USERNAME}/www-app:latest"
echo "  ${DOCKERHUB_USERNAME}/app-client:latest"
echo "  ${DOCKERHUB_USERNAME}/app-server:latest"
echo ""
echo "Next steps:"
echo "  1. Push images:"
echo "     docker push ${DOCKERHUB_USERNAME}/www-app:latest"
echo "     docker push ${DOCKERHUB_USERNAME}/app-client:latest"
echo "     docker push ${DOCKERHUB_USERNAME}/app-server:latest"
echo ""
echo "  2. Or use the push script:"
echo "     ./infrastructure/scripts/push-prod.sh"
