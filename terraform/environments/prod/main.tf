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
    key            = "prod/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "enterprise-deployment-platform-tflocks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source               = "../../modules/vpc"
  project_name         = var.project_name
  environment          = "prod"
  vpc_cidr             = "10.1.0.0/16"
  public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
  private_subnet_cidrs = ["10.1.3.0/24", "10.1.4.0/24"]
  create_nat_gateway   = true
}

module "eks" {
  source              = "../../modules/eks"
  project_name        = var.project_name
  environment         = "prod"
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  private_subnet_ids  = module.vpc.private_subnet_ids
  kubernetes_version  = "1.33"
  node_instance_types = ["t3.medium"]
  desired_size        = 2
  min_size            = 1
  max_size            = 2
  public_access_cidrs = [var.allowed_eks_access_cidr]
}
