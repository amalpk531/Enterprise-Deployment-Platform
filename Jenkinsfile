// =====================================================================
// Enterprise Deployment Platform — CI/CD Pipeline
//
// Flow: Checkout -> Build -> Unit Tests -> SonarQube -> Quality Gate ->
//       Trivy FS Scan -> Docker Build -> Trivy Image Scan -> Push ->
//       Deploy Dev -> Manual Approval -> Update GitOps -> Verify Prod
//
// Requires these Jenkins Global Environment variables (Manage Jenkins ->
// System -> Global properties -> Environment variables):
//   DOCKERHUB_USERNAME, DEV_DEPLOY_HOST, NOTIFY_EMAIL
//
// Requires these credentials (Manage Jenkins -> Credentials):
//   dockerhub-token      (Username with password: amalpk531 / <token>)
//   github-token         (Secret text: GitHub fine-grained PAT)
//   dev-deploy-ssh-key   (SSH username with private key: ubuntu)
//   eks-kubeconfig       (Secret file: kubeconfig for prod EKS cluster)
//   sonarqube-token      (configured against the 'SonarQube' server in
//                         Manage Jenkins -> System -> SonarQube servers)
// =====================================================================

pipeline {
    agent any

    environment {
        IMAGE_NAME          = 'enterprise-app'
        FULL_IMAGE          = "${DOCKERHUB_USERNAME}/${IMAGE_NAME}"

        GITHUB_ORG          = 'amalpk531'
        APP_REPO            = 'Enterprise-Deployment-Platform'
        GITOPS_REPO         = 'Enterprise-Deployment-Platform-gitops'

        DEV_DEPLOY_USER     = 'ubuntu'
        SONAR_PROJECT_KEY   = 'enterprise-app'

        // Matches docker-compose.dev.yml: host port 80 -> container 8080,
        // healthcheck path /api/health
        HEALTHCHECK_URL     = "http://${DEV_DEPLOY_HOST}/api/health"

        // How many old local image tags to retain on the Jenkins agent
        IMAGE_RETENTION     = '5'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                }
                echo "Checked out commit ${env.GIT_COMMIT_SHORT}"
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
                sh """
                    docker build -f app/Dockerfile -t ${FULL_IMAGE}:${BUILD_NUMBER} .
                """
                echo "Built image ${FULL_IMAGE}:${BUILD_NUMBER}"
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh "trivy image --severity HIGH,CRITICAL --exit-code 1 --no-progress ${FULL_IMAGE}:${BUILD_NUMBER}"
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-token',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                    '''
                }
                sh """
                    docker tag ${FULL_IMAGE}:${BUILD_NUMBER} ${FULL_IMAGE}:latest
                    docker push ${FULL_IMAGE}:${BUILD_NUMBER}
                    docker push ${FULL_IMAGE}:latest
                """
            }
            post {
                always {
                    sh 'docker logout || true'
                }
            }
        }

        stage('Deploy to Dev') {
            steps {
                retry(3) {
                    sshagent(['dev-deploy-ssh-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${DEV_DEPLOY_USER}@${DEV_DEPLOY_HOST} \
                              "cd /opt/enterprise-app && \
                               IMAGE_TAG=${BUILD_NUMBER} docker compose -f docker-compose.dev.yml pull && \
                               IMAGE_TAG=${BUILD_NUMBER} docker compose -f docker-compose.dev.yml up -d"
                        """
                    }
                }
            }
            post {
                success {
                    notifyEmail("Dev Deployment Success", "Build #${BUILD_NUMBER} (${env.GIT_COMMIT_SHORT}) deployed to dev.")
                }
                failure {
                    notifyEmail("Dev Deployment Failure", "Dev deployment failed for build #${BUILD_NUMBER}. Check Jenkins logs.")
                }
            }
        }

        stage('Dev Health Check') {
            steps {
                retry(5) {
                    sh """
                        sleep 5
                        curl -fsS --max-time 10 ${HEALTHCHECK_URL}
                    """
                }
                echo "Dev environment healthy at ${HEALTHCHECK_URL}"
            }
        }

        stage('Manual Approval') {
            steps {
                script {
                    notifyEmail("Awaiting Approval", "Build #${BUILD_NUMBER} is deployed to dev and awaiting production approval.")
                    timeout(time: 30, unit: 'MINUTES') {
                        input message: 'Deploy to Production?', ok: 'Approve', submitterParameter: 'APPROVER'
                    }
                    echo "Approved by: ${env.APPROVER}"
                    writeFile file: 'audit.log', text: "Build #${BUILD_NUMBER} approved by ${env.APPROVER} at ${new Date()}\n"
                    archiveArtifacts artifacts: 'audit.log', allowEmptyArchive: false
                }
            }
        }

        stage('Update GitOps') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    sh """
                        rm -rf gitops-repo
                        git clone --depth 1 https://x-access-token:\${GITHUB_TOKEN}@github.com/${GITHUB_ORG}/${GITOPS_REPO}.git gitops-repo
                        cd gitops-repo
                        git config user.email "jenkins@enterprise-platform.local"
                        git config user.name "Jenkins CI"
                        sed -i "s/^  tag: .*/  tag: \\"${BUILD_NUMBER}\\"/" helm/enterprise-app/values-prod.yaml
                        git add helm/enterprise-app/values-prod.yaml
                        git diff --cached --quiet || git commit -m "ci: bump prod image tag to ${BUILD_NUMBER} [skip ci]"
                        git push https://x-access-token:\${GITHUB_TOKEN}@github.com/${GITHUB_ORG}/${GITOPS_REPO}.git main
                    """
                }
            }
        }

        stage('Verify Prod Deployment') {
            steps {
                // Requires the Jenkins node's public IP on the EKS cluster's
                // public access CIDR allowlist, or kubectl will time out.
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
                    notifyEmail("Production Deployment Success", "Build #${BUILD_NUMBER} deployed to production via Argo CD.")
                }
                failure {
                    notifyEmail("Production Deployment Failure", "Production deployment verification failed for build #${BUILD_NUMBER}.")
                }
            }
        }
    }

    post {
        always {
            // Keep only the N most recent local image tags for this app
            // so the Jenkins agent's disk doesn't fill up over time.
            sh """
                docker images ${FULL_IMAGE} --format '{{.Tag}}' \
                  | grep -E '^[0-9]+\$' \
                  | sort -rn \
                  | tail -n +\$((${IMAGE_RETENTION} + 1)) \
                  | xargs -r -I {} docker rmi ${FULL_IMAGE}:{} || true
                docker image prune -f || true
            """
            cleanWs()
        }
        failure {
            notifyEmail("Pipeline Failure", "Pipeline failed at stage: ${env.STAGE_NAME} (build #${BUILD_NUMBER}).")
        }
    }
}

def notifyEmail(String subject, String body) {
    emailext(
        subject: "${subject} - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
        body: "${body}\n\nView build: ${env.BUILD_URL}",
        to: "${env.CHANGE_AUTHOR_EMAIL ?: env.NOTIFY_EMAIL}"
    )
}