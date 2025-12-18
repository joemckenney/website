#!/bin/bash

echo "🔌 Setting up port-forwarding for local databases..."
echo ""
echo "This will forward database ports to localhost:"
echo "  - PostgreSQL (user-service): localhost:5432"
echo ""
echo "Press Ctrl+C to stop all port-forwards"
echo ""

# Function to cleanup background jobs on exit
cleanup() {
    echo ""
    echo "🛑 Stopping port-forwards..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Port-forward user-service postgres
echo "🗄️  Forwarding user-service-postgres to localhost:5432..."
kubectl port-forward svc/user-service-postgres 5432:5432 &

# Wait for all background jobs
wait
