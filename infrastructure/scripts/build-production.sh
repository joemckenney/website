#!/bin/bash
set -e

echo "Building images for production deployment..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
REGISTRY="${CONTAINER_REGISTRY:-registry.digitalocean.com/your-registry}"
TAG="${IMAGE_TAG:-latest}"

echo -e "${YELLOW}Using registry: $REGISTRY${NC}"
echo -e "${YELLOW}Using tag: $TAG${NC}"
echo ""

# Build from repository root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo -e "${YELLOW}Building app-server image...${NC}"
docker build -t "$REGISTRY/app-server:$TAG" \
    -f apps/@api/app/Dockerfile .

echo -e "${YELLOW}Building app-client image...${NC}"
docker build -t "$REGISTRY/app-client:$TAG" \
    -f apps/@app/app/Dockerfile .

echo -e "${YELLOW}Pushing images to registry...${NC}"
docker push "$REGISTRY/app-server:$TAG"
docker push "$REGISTRY/app-client:$TAG"

echo -e "${GREEN}Build and push complete!${NC}"
echo ""
echo "Images:"
echo "  $REGISTRY/app-server:$TAG"
echo "  $REGISTRY/app-client:$TAG"
echo ""
echo "Next steps:"
echo "  1. Update infrastructure/helm/values/production.yaml with correct image repositories"
echo "  2. Deploy with: ./scripts/deploy-production.sh"
