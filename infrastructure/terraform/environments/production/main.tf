terraform {
  required_version = ">= 1.0"

  required_providers {
    vultr = {
      source  = "vultr/vultr"
      version = "~> 2.0"
    }
  }

  # Uncomment to use remote state
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "production/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "vultr" {
  api_key     = var.vultr_api_key
  rate_limit  = 700
  retry_limit = 3
}

module "vke_cluster" {
  source = "../../modules/vultr-vke"

  cluster_name        = var.cluster_name
  region              = var.region
  kubernetes_version  = var.kubernetes_version
  node_plan           = var.node_plan
  node_count          = var.node_count
  enable_autoscaling  = var.enable_autoscaling
  min_nodes           = var.min_nodes
  max_nodes           = var.max_nodes
  enable_firewall     = var.enable_firewall
}

# Install nginx ingress controller
resource "null_resource" "install_nginx_ingress" {
  depends_on = [module.vke_cluster]

  provisioner "local-exec" {
    command = <<-EOT
      kubectl --kubeconfig=${path.module}/../../modules/vultr-vke/kubeconfig \
        apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
    EOT
  }
}

# Install cert-manager
resource "null_resource" "install_cert_manager" {
  depends_on = [null_resource.install_nginx_ingress]

  provisioner "local-exec" {
    command = <<-EOT
      kubectl --kubeconfig=${path.module}/../../modules/vultr-vke/kubeconfig \
        apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
    EOT
  }
}

# Create Let's Encrypt cluster issuer
resource "null_resource" "create_cluster_issuer" {
  depends_on = [null_resource.install_cert_manager]

  provisioner "local-exec" {
    command = <<-EOT
      sleep 30 && kubectl --kubeconfig=${path.module}/../../modules/vultr-vke/kubeconfig apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ${var.letsencrypt_email}
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
    EOT
  }
}
