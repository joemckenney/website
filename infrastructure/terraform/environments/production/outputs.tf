output "cluster_id" {
  description = "VKE Cluster ID"
  value       = module.vke_cluster.cluster_id
}

output "cluster_endpoint" {
  description = "VKE Cluster Endpoint"
  value       = module.vke_cluster.cluster_endpoint
}

output "cluster_ip" {
  description = "VKE Cluster IP"
  value       = module.vke_cluster.cluster_ip
}

output "cluster_version" {
  description = "Kubernetes Version"
  value       = module.vke_cluster.cluster_version
}

output "kubeconfig_location" {
  description = "Location of kubeconfig file"
  value       = "${path.module}/../../modules/vultr-vke/kubeconfig"
}
