#!/bin/bash
# Test script for build-avoidance logic
# Usage: ./scripts/test-build-avoidance.sh [BASE_REF]
# Example: ./scripts/test-build-avoidance.sh HEAD~3
#          ./scripts/test-build-avoidance.sh origin/main

set -e

BASE_REF="${1:-HEAD~1}"

echo "=== Build Avoidance Test ==="
echo "Testing against: $BASE_REF"
echo ""

# Verify BASE_REF exists
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "ERROR: BASE_REF '$BASE_REF' does not exist"
  exit 1
fi

echo "=== Changed files ==="
git diff --name-only "$BASE_REF"..HEAD | head -20
echo ""

echo "=== Affected packages (pnpm filter) ==="
AFFECTED_PACKAGES=$(pnpm ls -r --depth -1 --filter="...[$BASE_REF]" --json 2>/dev/null | jq -r '.[].name' 2>/dev/null || echo "")
echo "$AFFECTED_PACKAGES"
echo ""

# Helper function to check if a package or its dependencies are affected
check_package() {
  local pkg=$1
  local output_var=$2

  # Get all packages that would trigger a rebuild of this package (itself + dependencies)
  local trigger_packages=$(pnpm ls -r --depth -1 --filter="${pkg}..." --json 2>/dev/null | jq -r '.[].name' 2>/dev/null || echo "")

  # Check if any affected package is in the trigger list
  local found=false
  for affected in $AFFECTED_PACKAGES; do
    for trigger in $trigger_packages; do
      if [ "$affected" = "$trigger" ]; then
        found=true
        break 2
      fi
    done
  done

  if [ "$found" = "true" ]; then
    echo "✅ ${pkg} -> ${output_var}=true (will build)"
  else
    echo "⏭️  ${pkg} -> ${output_var}=false (skip)"
  fi
}

echo "=== Build decisions ==="
check_package "@app/www" "www_web"
check_package "@app/dashboard" "app_web"
check_package "@gateway/service" "api_service"
check_package "@users/service" "user_service"
check_package "@agent/service" "agent_service"
check_package "@strava/mcp-server" "strava_service"

echo ""
echo "=== Summary ==="
echo "Run with different BASE_REF to test other scenarios:"
echo "  ./scripts/test-build-avoidance.sh HEAD~1    # Last commit"
echo "  ./scripts/test-build-avoidance.sh HEAD~5    # Last 5 commits"
echo "  ./scripts/test-build-avoidance.sh origin/main  # Compare to main"
