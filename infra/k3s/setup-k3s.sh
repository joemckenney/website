#!/usr/bin/env bash
# Run this script inside the rookery VM after the disk is resized.
#
# Usage: bash setup-k3s.sh
#
# Installs k3s (single-node, no Traefik, no ServiceLB).
# Images are pulled from Docker Hub (crowprose/*), public, no auth needed.

set -euo pipefail

# --- Grow root partition ---

echo "==> Growing root partition..."
if command -v growpart &>/dev/null; then
  sudo growpart /dev/vda 3 2>/dev/null || echo "    Partition already at max size"
  sudo btrfs filesystem resize max / 2>/dev/null || sudo resize2fs /dev/vda3 2>/dev/null || true
fi
echo "    Root filesystem: $(df -h / | tail -1 | awk '{print $2}')"

# --- Install k3s ---

echo "==> Installing k3s..."
curl -sfL https://get.k3s.io | sh -s - \
  --disable traefik \
  --disable servicelb \
  --write-kubeconfig-mode 644

echo "==> Waiting for k3s to be ready..."
sleep 10

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

kubectl wait --for=condition=Ready node --all --timeout=120s
echo "==> k3s node is Ready"

# --- Verify ---

echo ""
echo "==> Verification:"
kubectl get nodes -o wide
kubectl get pods -A
kubectl get storageclass
echo ""
echo "k3s is ready!"
