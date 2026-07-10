variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "project_name" {
  type    = string
  default = "enterprise-deployment-platform"
}

variable "key_name" {
  description = "AWS EC2 key pair name"
  type        = string
  default     = "_capstone"
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH into instances. Replace with your IP/32."
  type        = string
  default     = "0.0.0.0/0"
}

variable "allowed_jenkins_cidr" {
  description = "CIDR block allowed to access Jenkins UI"
  type        = string
  default     = "0.0.0.0/0"
}

variable "allowed_sonarqube_cidr" {
  description = "CIDR block allowed to access SonarQube UI"
  type        = string
  default     = "0.0.0.0/0"
}
