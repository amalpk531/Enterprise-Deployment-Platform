# Enterprise Deployment Platform -- Complete Project Description

## Project Overview

The **Enterprise Deployment Platform** is a production-oriented DevOps
project designed to automate the complete software delivery lifecycle of
a MERN (MongoDB, Express.js, React, Node.js) application using modern
DevOps, GitOps, and cloud-native technologies.

The objective of the project was to build an end-to-end deployment
platform where infrastructure, application deployment, security
scanning, and production releases are fully automated with minimal
manual intervention.

The project demonstrates Infrastructure as Code (IaC), Continuous
Integration (CI), Continuous Delivery (CD), Kubernetes orchestration,
and cloud-native deployment on Amazon Web Services (AWS).

## Phase 1 -- Application Development

-   Developed a MERN application.
-   Used Docker Compose with an Application container and a MongoDB
    container.
-   Persisted MongoDB data using a Docker named volume.
-   Development connection string:
    `mongodb://mongo:27017/enterprise_app`

## Phase 2 -- Containerization

-   Created production Dockerfiles.
-   Built immutable Docker images.
-   Pushed versioned images to Docker Hub through Jenkins.

Example: `amalpk531/enterprise-app:25`

## Phase 3 -- Infrastructure Provisioning

Provisioned AWS infrastructure using Terraform:

-   VPC
-   Public & Private Subnets
-   Internet Gateway
-   NAT Gateway
-   Route Tables
-   Security Groups
-   IAM Roles
-   Amazon EKS Cluster
-   Managed Node Groups

## Phase 4 -- Configuration Management

Configured Jenkins and SonarQube servers using Ansible.

## Phase 5 -- CI/CD Pipeline

Pipeline stages:

1.  Checkout
2.  Install Dependencies
3.  Unit Tests
4.  SonarQube Scan
5.  Quality Gate
6.  Trivy Filesystem Scan
7.  Docker Build
8.  Trivy Image Scan
9.  Docker Push
10. Update GitOps Repository

## Phase 6 -- DevSecOps

Integrated SonarQube and Trivy into the CI/CD pipeline.

## Phase 7 – GitOps

A dedicated GitOps repository was maintained to manage the Kubernetes deployment configuration separately from the application source code. The repository contains Helm charts, Kubernetes manifests, ArgoCD application configuration, and monitoring resources. Instead of deploying directly from Jenkins, the CI pipeline automatically updates the application image tag in the Helm `values-prod.yaml` file and pushes the changes to the GitOps repository. ArgoCD continuously monitors this repository and automatically synchronizes the production Kubernetes cluster whenever changes are detected, enabling a fully automated GitOps-based deployment workflow.

**GitOps Repository:**  
https://github.com/amalpk531/Enterprise-Deployment-Platform-gitops

## Phase 8 -- Kubernetes Deployment

Packaged the application with Helm and deployed it to Amazon EKS using
ArgoCD.

Resources include:

-   Namespace
-   Deployment
-   Service
-   ConfigMap
-   Secret
-   ServiceAccount
-   Ingress

## Phase 9 -- Database Architecture Decision

Initially MongoDB ran through Docker Compose for development.

For production, MongoDB Atlas was selected instead of running MongoDB
inside Kubernetes.

Development:

`mongodb://mongo:27017/enterprise_app`

Production:

`mongodb+srv://<atlas-connection-string>`

## Phase 10 -- Secret Management

Production secrets will be managed using:

AWS Secrets Manager → External Secrets Operator → Kubernetes Secret →
Application Pods.

The application continues using `process.env.MONGO_URI`.

## Phase 11 -- Monitoring (Planned)

-   Prometheus
-   Grafana
-   Alertmanager

## Final Architecture

Developer → GitHub → Jenkins → Docker Hub → GitOps Repository → ArgoCD →
Amazon EKS → NGINX Ingress → AWS Load Balancer → End Users

Application secrets:

AWS Secrets Manager → External Secrets Operator → Kubernetes Secret →
Application Pods → MongoDB Atlas

## Project Outcome

The project demonstrates an end-to-end enterprise DevOps platform using
Terraform, Ansible, Jenkins, Docker, Kubernetes, Helm, ArgoCD, AWS,
SonarQube, Trivy, and GitOps. Monitoring integration is planned as the
final enhancement.
