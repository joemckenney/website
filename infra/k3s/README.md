# k3s on libvirt/QEMU VM

Self-hosted k3s cluster running inside a libvirt/QEMU VM on the Framework Desktop (Arch Linux).

## Architecture

```
Framework Desktop (Arch Linux host, "crowprose")
└── libvirt/QEMU
    └── rookery VM (Arch cloud image, NAT networking)
        └── k3s v1.34.4+k3s1 (single-node, Traefik disabled)
```

- **VM**: 64GB RAM, 12 vCPUs, 500GB disk (thin-provisioned btrfs)
- **Network**: NAT (192.168.122.x), host accesses VM via SSH
- **Storage**: btrfs @vms subvolume at `/var/lib/libvirt/images/`
- **k3s**: Single-node, no Traefik (Cloudflare Tunnel handles ingress), no ServiceLB
- **Images**: Docker Hub (`crowprose/*`), public, no registry auth needed

## Quick Setup

### 1. Host prerequisites

```bash
sudo pacman -S libvirt qemu-full virt-install dnsmasq edk2-ovmf
sudo systemctl enable --now libvirtd
sudo usermod -aG libvirt $USER

# Set default libvirt connection to system
mkdir -p ~/.config/libvirt
echo 'uri_default = "qemu:///system"' > ~/.config/libvirt/libvirt.conf
```

### 2. Create and configure VM

```bash
sudo ./setup-host.sh
```

### 3. Docker + libvirt iptables fix

Docker sets the iptables FORWARD policy to DROP, which blocks VM outbound traffic.
Create a systemd service to add the required rules:

```bash
sudo tee /etc/systemd/system/libvirt-forward.service <<'EOF'
[Unit]
Description=iptables rules for libvirt VM forwarding (Docker compat)
After=docker.service libvirtd.service
Wants=docker.service libvirtd.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/iptables -I FORWARD -i virbr0 -o wlp192s0 -j ACCEPT
ExecStart=/usr/bin/iptables -I FORWARD -i wlp192s0 -o virbr0 -m state --state RELATED,ESTABLISHED -j ACCEPT

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable libvirt-forward.service
```

### 4. Install k3s in the VM

```bash
ssh joe@<VM_IP>
sudo growpart /dev/vda 3
sudo btrfs filesystem resize max /
curl -sfL https://get.k3s.io | sh -s - --disable traefik --disable servicelb --write-kubeconfig-mode 644
```

### 5. Copy kubeconfig to host

```bash
scp joe@<VM_IP>:/etc/rancher/k3s/k3s.yaml ~/.kube/k3s-config
sed -i 's/127.0.0.1/<VM_IP>/' ~/.kube/k3s-config
echo 'export KUBECONFIG="$HOME/.kube/k3s-config"' >> ~/.zshrc
```

## Files

| File | Description |
|------|-------------|
| `setup-host.sh` | Host-side setup: downloads image, chroot config, creates VM |
| `setup-k3s.sh` | VM-side setup: installs k3s |
| `cloud-init/` | Cloud-init configs (kept for reference, not used by setup-host.sh) |

## VM Management

```bash
# SSH into VM
ssh joe@$(virsh domifaddr rookery | grep -oP '192\.168\.\d+\.\d+')

# VM lifecycle
virsh start rookery
virsh shutdown rookery
virsh reboot rookery

# Remove VM completely
virsh destroy rookery
virsh undefine rookery --nvram
rm /var/lib/libvirt/images/rookery.qcow2
```

## Troubleshooting

### VM has no internet (ping 8.8.8.8 fails)
Docker's iptables FORWARD DROP policy blocks libvirt NAT. Check:
```bash
sudo iptables -L FORWARD -n -v  # look for policy DROP
```
Fix: enable the `libvirt-forward.service` (see above).

### sshd not starting in VM
Check `systemctl list-jobs` inside the VM. If `systemd-time-wait-sync` is stuck,
mask it: `sudo systemctl mask systemd-time-wait-sync.service`
