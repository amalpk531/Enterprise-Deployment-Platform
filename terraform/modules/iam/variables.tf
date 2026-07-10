variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "create_ec2_role" {
  type    = bool
  default = false
}
