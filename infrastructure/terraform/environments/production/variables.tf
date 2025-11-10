variable "vultr_api_key" {
  description = "Vultr API key"
  type        = string
  sensitive   = true
}

variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
  default     = "app-production"
}

variable "region" {
  description = "Vultr region"
  type        = string
  default     = "ewr"  # New Jersey
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "v1.28.2+1"
}

variable "node_plan" {
  description = "Vultr node plan"
  type        = string
  default     = "vc2-2c-4gb"
}

variable "node_count" {
  description = "Initial number of nodes"
  type        = number
  default     = 2
}

variable "enable_autoscaling" {
  description = "Enable autoscaling"
  type        = bool
  default     = true
}

variable "min_nodes" {
  description = "Minimum nodes when autoscaling"
  type        = number
  default     = 2
}

variable "max_nodes" {
  description = "Maximum nodes when autoscaling"
  type        = number
  default     = 5
}

variable "enable_firewall" {
  description = "Enable firewall"
  type        = bool
  default     = true
}

variable "letsencrypt_email" {
  description = "Email for Let's Encrypt certificates"
  type        = string
}
