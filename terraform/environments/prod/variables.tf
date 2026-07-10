variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "project_name" {
  type    = string
  default = "enterprise-deployment-platform"
}

variable "allowed_eks_access_cidr" {
  description = "CIDR block allowed to access EKS public endpoint. Replace with your IP/32."
  type        = string
  default     = "0.0.0.0/0"
}
