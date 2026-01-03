variable "region" {
  description = "Vultr region for the cluster"
  type        = string
  default     = "ewr"  # New Jersey
}

variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "v1.28.2+1"
}

variable "node_plan" {
  description = "Vultr plan for nodes"
  type        = string
  default     = "vc2-2c-4gb"  # 2 vCPU, 4GB RAM
}

variable "node_count" {
  description = "Number of nodes in the default node pool"
  type        = number
  default     = 2
}

variable "enable_autoscaling" {
  description = "Enable autoscaling for the node pool"
  type        = bool
  default     = true
}

variable "min_nodes" {
  description = "Minimum number of nodes when autoscaling"
  type        = number
  default     = 2
}

variable "max_nodes" {
  description = "Maximum number of nodes when autoscaling"
  type        = number
  default     = 5
}

variable "enable_firewall" {
  description = "Enable firewall for the cluster"
  type        = bool
  default     = true
}
