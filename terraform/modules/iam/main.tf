# EC2 instance profile for dev deploy server
# Allows SSM access and optional ECR pull (not used with Docker Hub in this project)
resource "aws_iam_role" "ec2_role" {
  count = var.create_ec2_role ? 1 : 0
  name  = "${var.project_name}-${var.environment}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  count      = var.create_ec2_role ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  role       = aws_iam_role.ec2_role[0].name
}

resource "aws_iam_instance_profile" "ec2_profile" {
  count = var.create_ec2_role ? 1 : 0
  name  = "${var.project_name}-${var.environment}-ec2-profile"
  role  = aws_iam_role.ec2_role[0].name
}
