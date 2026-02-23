#!/usr/bin/env bash
# Phase 2: VM + k3s Setup
# Sets up a libvirt/QEMU VM running k3s on the Framework Desktop.
#
# Usage: sudo ./setup-host.sh
#
# Prerequisites:
#   - Arch Linux host with libvirt, qemu-full, virt-install, dnsmasq, edk2-ovmf installed
#   - libvirtd running: systemctl enable --now libvirtd
#   - Default NAT network running: virsh net-start default && virsh net-autostart default
#   - /var/lib/libvirt/images/ available (btrfs @vms subvolume)
#   - Docker iptables forwarding fix (see below)
#
# Note: The Arch cloud image's cloud-init does not reliably enable sshd.
# This script uses qemu-nbd + chroot to configure the image directly.

set -euo pipefail

VM_NAME="rookery"
VM_DIR="/var/lib/libvirt/images"
CLOUD_IMG_URL="https://geo.mirror.pkgbuild.com/images/latest/Arch-Linux-x86_64-cloudimg.qcow2"
CLOUD_IMG="${VM_DIR}/Arch-Linux-x86_64-cloudimg.qcow2"
VM_DISK="${VM_DIR}/${VM_NAME}.qcow2"
SSH_PUBKEY_FILE="/home/joe/.ssh/id_ed25519.pub"

MEMORY=65536      # 64GB
VCPUS=12          # 12 vCPUs (leaves 4 for host)
DISK_SIZE="500G"  # thin-provisioned

# --- Preflight checks ---

if [[ $EUID -ne 0 ]]; then
  echo "Error: This script must be run as root (sudo)."
  exit 1
fi

if ! systemctl is-active --quiet libvirtd; then
  echo "Error: libvirtd is not running. Start it with: systemctl enable --now libvirtd"
  exit 1
fi

if ! virsh net-info default &>/dev/null; then
  echo "Error: Default network not found. Create it first (see README.md)."
  exit 1
fi

if virsh dominfo "$VM_NAME" &>/dev/null; then
  echo "Error: VM '$VM_NAME' already exists. Remove it first with: virsh destroy $VM_NAME && virsh undefine $VM_NAME --nvram"
  exit 1
fi

if [[ ! -f "$SSH_PUBKEY_FILE" ]]; then
  echo "Error: SSH public key not found at $SSH_PUBKEY_FILE"
  exit 1
fi

SSH_PUBKEY=$(cat "$SSH_PUBKEY_FILE")

# --- Step 1: Download Arch cloud image ---

echo "==> Downloading Arch Linux cloud image..."
if [[ -f "$CLOUD_IMG" ]]; then
  echo "    Cloud image already exists, skipping download."
else
  curl -L -o "$CLOUD_IMG" "$CLOUD_IMG_URL"
fi

# --- Step 2: Prepare VM disk ---

echo "==> Creating VM disk (${DISK_SIZE}, thin-provisioned)..."
cp "$CLOUD_IMG" "$VM_DISK"
qemu-img resize "$VM_DISK" "$DISK_SIZE"

# --- Step 3: Configure the image via chroot ---

echo "==> Mounting disk image via qemu-nbd..."
modprobe nbd
qemu-nbd -c /dev/nbd0 "$VM_DISK"
sleep 1

# The Arch cloud image has: p1=BIOS boot, p2=EFI, p3=root (btrfs)
mount /dev/nbd0p3 /mnt
mount --bind /dev /mnt/dev
mount --bind /proc /mnt/proc
mount --bind /sys /mnt/sys

echo "==> Configuring VM image..."
chroot /mnt /bin/bash <<CHROOT_EOF
# Set root password (temporary, for console debug)
echo "root:changeme" | chpasswd

# Create joe user
useradd -m -G wheel -s /bin/bash joe
echo "joe:changeme" | chpasswd
echo "joe ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/joe

# SSH key
mkdir -p /home/joe/.ssh
echo "${SSH_PUBKEY}" > /home/joe/.ssh/authorized_keys
chmod 700 /home/joe/.ssh
chmod 600 /home/joe/.ssh/authorized_keys
chown -R joe:joe /home/joe/.ssh

# Enable services
systemctl enable sshd
systemctl enable systemd-networkd
systemctl enable systemd-resolved
systemctl enable systemd-timesyncd

# Disable time-wait-sync (hangs without NTP on first boot)
systemctl mask systemd-time-wait-sync.service

# Network config for DHCP
cat > /etc/systemd/network/20-wired.network <<'NET_EOF'
[Match]
Name=en*

[Network]
DHCP=yes
NET_EOF

# Set hostname and timezone
echo "${VM_NAME}" > /etc/hostname
ln -sf /usr/share/zoneinfo/America/Los_Angeles /etc/localtime
CHROOT_EOF

echo "==> Unmounting..."
umount /mnt/sys /mnt/proc /mnt/dev /mnt
qemu-nbd -d /dev/nbd0

# --- Step 4: Create the VM ---

echo "==> Creating VM '${VM_NAME}'..."
virt-install \
  --name "$VM_NAME" \
  --memory "$MEMORY" \
  --vcpus "$VCPUS" \
  --disk "path=${VM_DISK},format=qcow2,bus=virtio" \
  --os-variant archlinux \
  --network network=default,model=virtio \
  --graphics none \
  --console pty,target_type=serial \
  --boot uefi \
  --noautoconsole \
  --import

# --- Step 5: Set VM to autostart ---

echo "==> Setting VM to autostart on host boot..."
virsh autostart "$VM_NAME"

# --- Step 6: Wait for VM to get an IP ---

echo "==> Waiting for VM to boot and get an IP address..."
VM_IP=""
for i in $(seq 1 60); do
  VM_IP=$(virsh domifaddr "$VM_NAME" 2>/dev/null | grep -oP '192\.168\.\d+\.\d+' | head -1) || true
  if [[ -n "$VM_IP" ]]; then
    break
  fi
  sleep 2
done

if [[ -z "$VM_IP" ]]; then
  echo "Error: Could not get VM IP after 120 seconds."
  echo "Check with: virsh domifaddr $VM_NAME"
  exit 1
fi

# --- Step 7: Wait for SSH ---

echo "==> Waiting for SSH on ${VM_IP}..."
for i in $(seq 1 30); do
  if ssh -o ConnectTimeout=2 -o StrictHostKeyChecking=no -o BatchMode=yes joe@"$VM_IP" true 2>/dev/null; then
    break
  fi
  sleep 3
done

echo ""
echo "==> VM '${VM_NAME}' is ready at ${VM_IP}"
echo ""
echo "Next steps:"
echo "  1. SSH in: ssh joe@${VM_IP}"
echo "  2. Grow root partition:"
echo "     sudo growpart /dev/vda 3"
echo "     sudo btrfs filesystem resize max /"
echo "  3. Install k3s (or SCP the binary if outbound TCP is blocked by Docker):"
echo "     curl -sfL https://get.k3s.io | sh -s - --disable traefik --disable servicelb --write-kubeconfig-mode 644"
echo "  4. Copy kubeconfig to host:"
echo "     scp joe@${VM_IP}:/etc/rancher/k3s/k3s.yaml ~/.kube/k3s-config"
echo "     sed -i 's/127.0.0.1/${VM_IP}/' ~/.kube/k3s-config"
