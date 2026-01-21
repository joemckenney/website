#!/bin/bash
# Opens Prisma Studio connected to the production users database
# Requires: kubectl configured with production cluster access

set -e

KUBECONFIG="${KUBECONFIG:-$HOME/.kube/vultr-prod-config}"
LOCAL_PORT=5440
REMOTE_PORT=5432
SERVICE="user-postgres-postgresql"
DB_NAME="users"
DB_USER="users"

echo "Fetching production database password..."
DB_PASSWORD=$(KUBECONFIG="$KUBECONFIG" kubectl get secret "$SERVICE" -o jsonpath='{.data.password}' | base64 -d)

if [ -z "$DB_PASSWORD" ]; then
  echo "Error: Could not fetch database password from secret"
  exit 1
fi

echo "Starting port-forward to production database on localhost:$LOCAL_PORT..."
KUBECONFIG="$KUBECONFIG" kubectl port-forward "svc/$SERVICE" "$LOCAL_PORT:$REMOTE_PORT" &
PF_PID=$!

# Cleanup on exit
cleanup() {
  echo ""
  echo "Stopping port-forward..."
  kill $PF_PID 2>/dev/null || true
}
trap cleanup EXIT

# Wait for port-forward to be ready
sleep 2

# Check if port-forward is still running
if ! kill -0 $PF_PID 2>/dev/null; then
  echo "Error: Port-forward failed to start"
  exit 1
fi

echo "Port-forward established. Starting Prisma Studio..."
echo ""
echo "WARNING: You are connected to PRODUCTION data. Be careful!"
echo ""

# Run prisma studio with the production DATABASE_URL
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:$LOCAL_PORT/$DB_NAME" npx prisma studio

echo "Prisma Studio closed."
