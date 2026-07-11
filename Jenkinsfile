pipeline {
    agent any

    environment {
        DOCKERHUB_USERNAME = 'amalpk531'
        IMAGE_NAME          = 'enterprise-app'
        FULL_IMAGE          = "${DOCKERHUB_USERNAME}/${IMAGE_NAME}"

        GITHUB_ORG          = 'amalpk531'
        APP_REPO            = 'Enterprise-Deployment-Platform'
        GITOPS_REPO         = 'Enterprise-Deployment-Platform-gitops'

        // TODO: hardcoded for capstone scope — replace with Terraform output / SSM lookup later
        DEV_DEPLOY_HOST     = '3.110.94.160'
        DEV_DEPLOY_USER     = 'ubuntu'

        SONAR_PROJECT_KEY   = 'enterprise-app'
        NOTIFY_EMAIL        = 'amal18120007@gmail.com'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                }
            }
        }

        stage('Build') {
            steps {
                dir('app/backend') {
                    sh 'npm ci'
                }
                dir('app/frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Unit Tests') {
            steps {
                dir('app/backend') {
                    sh 'npm test'
                }
            }
            post {
                always {
                    junit testResults: 'app/backend/test-results.xml', allowEmptyResults: true
                }
            }
        }

stage('SonarQube Scan') {
    steps {
        withSonarQubeEnv('SonarQube') {
            script {
                def scannerHome = tool 'SonarScanner'
                sh """
                    cd app && ${scannerHome}/bin/sonar-scanner \
                      -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                      -Dsonar.sources=backend,frontend/src \
                      -Dsonar.tests=backend/tests \
                      -Dsonar.test.inclusions=backend/tests/**/*.js \
                      -Dsonar.exclusions=backend/tests/**,node_modules/**,dist/**,build/**,.next/** \
                      -Dsonar.javascript.lcov.reportPaths=backend/coverage/lcov.info
                """
            }
        }
    }
}
        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Trivy FS Scan') {
            steps {
                sh 'trivy fs --severity HIGH,CRITICAL --exit-code 1 --no-progress .'
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    dockerImage = docker.build("${FULL_IMAGE}:${BUILD_NUMBER}", "-f app/Dockerfile .")
                }
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh "trivy image --severity HIGH,CRITICAL --exit-code 1 --no-progress ${FULL_IMAGE}:${BUILD_NUMBER}"
            }
        }

        stage('Push to Docker Hub') {
            steps {
                script {
                    docker.withRegistry('', 'dockerhub-token') {
                        dockerImage.push("${BUILD_NUMBER}")
                        dockerImage.push("latest")
                    }
                }
            }
        }

        stage('Deploy to Dev') {
            steps {
                sshagent(['dev-deploy-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEV_DEPLOY_USER}@${DEV_DEPLOY_HOST} \
                          "cd /opt/enterprise-app && \
                           IMAGE_TAG=${BUILD_NUMBER} docker compose -f docker-compose.dev.yml pull && \
                           IMAGE_TAG=${BUILD_NUMBER} docker compose -f docker-compose.dev.yml up -d"
                    """
                }
            }
            post {
                success {
                    notifyEmail("Dev Deployment Success", "Application deployed to dev environment.")
                }
                failure {
                    notifyEmail("Dev Deployment Failure", "Dev deployment failed. Check Jenkins logs.")
                }
            }
        }

        stage('Manual Approval') {
            steps {
                script {
                    notifyEmail("Awaiting Approval", "Please approve production deployment in Jenkins.")
                    timeout(time: 30, unit: 'MINUTES') {
                        input message: 'Deploy to Production?', ok: 'Approve', submitterParameter: 'APPROVER'
                    }
                    echo "Approved by: ${env.APPROVER}"
                    writeFile file: 'audit.log', text: "Build #${BUILD_NUMBER} approved by ${env.APPROVER} at ${new Date()}\n"
                    archiveArtifacts artifacts: 'audit.log', allowEmptyArchive: false
                }
            }
        }

        stage('Update Prod Git Tag') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    sh '''
                        rm -rf gitops-repo
                        git clone --depth 1 https://${GITHUB_TOKEN}@github.com/'''+"${GITHUB_ORG}/${GITOPS_REPO}"+'''.git gitops-repo
                        cd gitops-repo
                        git config user.email "jenkins@enterprise-platform.local"
                        git config user.name "Jenkins CI"
                        sed -i "s/^  tag: .*/  tag: \\"${BUILD_NUMBER}\\"/" helm/enterprise-app/values-prod.yaml
                        git add helm/enterprise-app/values-prod.yaml
                        git diff --cached --quiet || git commit -m "ci: bump prod image tag to ${BUILD_NUMBER} [skip ci]"
                        git push https://${GITHUB_TOKEN}@github.com/'''+"${GITHUB_ORG}/${GITOPS_REPO}"+'''.git main
                    '''
                }
            }
        }

        stage('Verify Prod Deployment') {
            steps {
                // NOTE: requires Jenkins node's public IP added to the EKS cluster's
                // public access CIDR allowlist, or this kubectl call will time out.
                withCredentials([kubeconfigFile(credentialsId: 'eks-kubeconfig', variable: 'KUBECONFIG')]) {
                    sh """
                        kubectl -n argocd annotate application enterprise-app argocd.argoproj.io/refresh=hard --overwrite
                        sleep 30
                        kubectl rollout status deployment/enterprise-app -n enterprise-app-prod --timeout=600s
                        kubectl get pods -n enterprise-app-prod -o wide
                    """
                }
            }
            post {
                success {
                    notifyEmail("Production Deployment Success", "Application deployed to production via Argo CD.")
                }
                failure {
                    notifyEmail("Production Deployment Failure", "Production deployment verification failed.")
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        failure {
            notifyEmail("Pipeline Failure", "Pipeline failed at stage: ${env.STAGE_NAME}")
        }
    }
}

def notifyEmail(String subject, String body) {
    emailext(
        subject: "${subject} - ${env.JOB_NAME} #${BUILD_NUMBER}",
        body: "${body}\n\nView build: ${BUILD_URL}",
        to: "${env.CHANGE_AUTHOR_EMAIL ?: env.NOTIFY_EMAIL}"
    )
}
