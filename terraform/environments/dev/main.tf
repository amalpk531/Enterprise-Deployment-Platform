terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Replace bucket and dynamodb_table values after running terraform/bootstrap
  backend "s3" {
    bucket         = "enterprise-deployment-platform-tfstate-e6235142"
    key            = "dev/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "enterprise-deployment-platform-tflocks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source              = "../../modules/vpc"
  project_name        = var.project_name
  environment         = "dev"
  vpc_cidr            = "10.0.0.0/16"
  public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
  create_nat_gateway  = false
}

module "jenkins_sg" {
  source       = "../../modules/security-group"
  project_name = var.project_name
  environment  = "dev"
  name         = "jenkins"
  description  = "Jenkins and SonarQube server security group"
  vpc_id       = module.vpc.vpc_id
  ingress_rules = [
    { from_port = 22, to_port = 22, protocol = "tcp", cidr_blocks = [var.allowed_ssh_cidr], description = "SSH" },
    { from_port = 8080, to_port = 8080, protocol = "tcp", cidr_blocks = [var.allowed_jenkins_cidr], description = "Jenkins UI" },
    { from_port = 9000, to_port = 9000, protocol = "tcp", cidr_blocks = [var.allowed_sonarqube_cidr], description = "SonarQube UI" }
  ]
}

module "dev_deploy_sg" {
  source       = "../../modules/security-group"
  project_name = var.project_name
  environment  = "dev"
  name         = "dev-deploy"
  description  = "Dev deployment server security group"
  vpc_id       = module.vpc.vpc_id
  ingress_rules = [
    { from_port = 22, to_port = 22, protocol = "tcp", cidr_blocks = [var.allowed_ssh_cidr], description = "SSH" },
    { from_port = 80, to_port = 80, protocol = "tcp", cidr_blocks = ["0.0.0.0/0"], description = "HTTP" }
  ]
}

module "jenkins" {
  source             = "../../modules/ec2"
  project_name       = var.project_name
  environment        = "dev"
  name               = "jenkins"
  instance_type      = "t3.large"
  key_name           = var.key_name
  subnet_id          = module.vpc.public_subnet_ids[0]
  security_group_ids = [module.jenkins_sg.security_group_id]
  volume_size        = 30
}

module "dev_deploy" {
  source             = "../../modules/ec2"
  project_name       = var.project_name
  environment        = "dev"
  name               = "dev-deploy"
  instance_type      = "t3.small"
  key_name           = var.key_name
  subnet_id          = module.vpc.public_subnet_ids[1]
  security_group_ids = [module.dev_deploy_sg.security_group_id]
  volume_size        = 20
}
