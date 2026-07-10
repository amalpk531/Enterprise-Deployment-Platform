variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "name" {
  description = "Server role/name"
  type        = string
}

variable "instance_type" {
  type    = string
  default = "t3.medium"
}

variable "key_name" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "security_group_ids" {
  type = list(string)
}

variable "volume_size" {
  type    = number
  default = 20
}

variable "user_data" {
  type    = string
  default = ""
}
