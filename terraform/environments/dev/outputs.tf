output "jenkins_public_ip" {
  value = module.jenkins.public_ip
}
#sonarqube in same instance as jenkins, so using jenkins_public_ip output for sonarqube as well.
output "sonarqube_public_ip" {
  value = module.jenkins.public_ip
}

output "dev_deploy_public_ip" {
  value = module.dev_deploy.public_ip
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "public_subnet_ids" {
  value = module.vpc.public_subnet_ids
}
