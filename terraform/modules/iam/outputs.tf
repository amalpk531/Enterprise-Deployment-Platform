output "instance_profile_name" {
  value = var.create_ec2_role ? aws_iam_instance_profile.ec2_profile[0].name : null
}
