#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default URLs (can be overridden with environment variables)
WWW_URL="${WWW_URL:-http://www.local.com}"
APP_URL="${APP_URL:-http://app.local.com}"
API_URL="${API_URL:-http://api.local.com}"

echo -e "${YELLOW}Starting smoke tests...${NC}"
echo ""

# Function to test a URL
test_url() {
    local name=$1
    local url=$2
    local expected_pattern=$3
    local max_retries=${4:-5}
    local retry=0

    echo -e "${YELLOW}Testing ${name}: ${url}${NC}"

    while [ $retry -lt $max_retries ]; do
        if curl -f -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
            if [ -n "$expected_pattern" ]; then
                response=$(curl -s "$url")
                if echo "$response" | grep -q "$expected_pattern"; then
                    echo -e "${GREEN}✓ ${name} is healthy${NC}"
                    return 0
                else
                    echo -e "${RED}✗ ${name} returned 200 but content doesn't match expected pattern${NC}"
                    return 1
                fi
            else
                echo -e "${GREEN}✓ ${name} is healthy${NC}"
                return 0
            fi
        fi

        retry=$((retry + 1))
        if [ $retry -lt $max_retries ]; then
            echo -e "${YELLOW}  Retry $retry/$max_retries...${NC}"
            sleep 5
        fi
    done

    echo -e "${RED}✗ ${name} failed after $max_retries attempts${NC}"
    return 1
}

# Test each application
test_url "www-app" "$WWW_URL" "" || exit 1
test_url "app-client" "$APP_URL" "" || exit 1
test_url "app-server" "$API_URL/ping" "pong" || exit 1

echo ""
echo -e "${GREEN}✅ All smoke tests passed!${NC}"
exit 0
