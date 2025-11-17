#!/bin/bash
set -e

echo "Pushing Docker images to Docker Hub..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check required environment variables
if [ -z "$DOCKERHUB_USERNAME" ]; then
    echo -e "${RED}Error: DOCKERHUB_USERNAME environment variable not set${NC}"
    echo "Set it with: export DOCKERHUB_USERNAME=your-username"
    exit 1
fi

# Check if logged into Docker Hub
if ! docker info | grep -q "Username"; then
    echo -e "${RED}Error: Not logged into Docker Hub${NC}"
    echo "Login with: docker login"
    exit 1
fi

echo -e "${YELLOW}Pushing images to Docker Hub...${NC}"
docker push ${DOCKERHUB_USERNAME}/www-app:latest
docker push ${DOCKERHUB_USERNAME}/app-client:latest
docker push ${DOCKERHUB_USERNAME}/app-server:latest

echo -e "${GREEN}Push complete!${NC}"
echo ""
echo "Images available at:"
echo "  https://hub.docker.com/r/${DOCKERHUB_USERNAME}/www-app"
echo "  https://hub.docker.com/r/${DOCKERHUB_USERNAME}/app-client"
echo "  https://hub.docker.com/r/${DOCKERHUB_USERNAME}/app-server"
echo ""
echo "Next step: Deploy to Vultr cluster"
echo "  ./infrastructure/scripts/deploy-prod.sh"
