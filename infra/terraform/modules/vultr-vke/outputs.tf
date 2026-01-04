output "cluster_id" {
  description = "ID of the VKE cluster"
  value       = vultr_kubernetes.cluster.id
}

output "cluster_endpoint" {
  description = "Endpoint of the VKE cluster"
  value       = vultr_kubernetes.cluster.endpoint
}

output "cluster_ip" {
  description = "IP address of the VKE cluster"
  value       = vultr_kubernetes.cluster.ip
}

output "kubeconfig" {
  description = "Kubeconfig for the cluster"
  value       = vultr_kubernetes.cluster.kube_config
  sensitive   = true
}

output "cluster_version" {
  description = "Kubernetes version of the cluster"
  value       = vultr_kubernetes.cluster.version
}
