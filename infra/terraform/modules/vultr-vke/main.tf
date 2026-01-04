terraform {
  required_providers {
    vultr = {
      source  = "vultr/vultr"
      version = "~> 2.0"
    }
  }
}

resource "vultr_kubernetes" "cluster" {
  region  = var.region
  label   = var.cluster_name
  version = var.kubernetes_version

  node_pools {
    node_quantity = var.node_count
    plan          = var.node_plan
    label         = "${var.cluster_name}-node-pool"
    auto_scaler   = var.enable_autoscaling
    min_nodes     = var.min_nodes
    max_nodes     = var.max_nodes
  }

  enable_firewall = var.enable_firewall
}

# Create a firewall group for the cluster
resource "vultr_firewall_group" "cluster" {
  count       = var.enable_firewall ? 1 : 0
  description = "Firewall for ${var.cluster_name}"
}

# Allow HTTPS from anywhere
resource "vultr_firewall_rule" "https" {
  count            = var.enable_firewall ? 1 : 0
  firewall_group_id = vultr_firewall_group.cluster[0].id
  protocol         = "tcp"
  ip_type          = "v4"
  subnet           = "0.0.0.0"
  subnet_size      = 0
  port             = "443"
  notes            = "Allow HTTPS"
}

# Allow HTTP from anywhere (for cert challenge)
resource "vultr_firewall_rule" "http" {
  count            = var.enable_firewall ? 1 : 0
  firewall_group_id = vultr_firewall_group.cluster[0].id
  protocol         = "tcp"
  ip_type          = "v4"
  subnet           = "0.0.0.0"
  subnet_size      = 0
  port             = "80"
  notes            = "Allow HTTP"
}

# Output kubeconfig
resource "local_file" "kubeconfig" {
  content  = vultr_kubernetes.cluster.kube_config
  filename = "${path.module}/kubeconfig"
  file_permission = "0600"
}
