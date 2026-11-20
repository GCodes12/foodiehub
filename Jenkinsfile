// ZAYORA CI pipeline (DEC-020). Runs on a local, native Jenkins (see docs/ci.md).
//
// Order is chosen for an 8 GB machine with a 3.8 GB Docker VM: tests run first (Maven + Testcontainers MySQL and
// Keycloak), their containers are removed, and only then is SonarQube started for the analysis. SonarQube is always
// stopped at the end, also when a stage fails, and a SonarQube that is already running is stopped before the tests.
// No stage runs SonarQube and the test containers at the same time.
//
// Fails on: compilation or test failure, skipped backend tests (Docker missing), type errors, frontend test or build
// failure, scanner failure, or a failed Quality Gate (checked by the scanners themselves; no webhook).
//
// Jenkins setup (docs/ci.md): SonarQube server named 'sonarqube-local' (token stored as a Jenkins credential), the
// SonarQube Scanner, Pipeline, JUnit, Timestamper and Workspace Cleanup plugins, and docker, java 21 and node on PATH.

def SONAR_COMPOSE = 'docker compose -f infra/sonarqube/compose.yaml --profile sonar'

pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    environment {
        // Caps the Maven JVM itself (8 GB machine); one build at a time (disableConcurrentBuilds above).
        MAVEN_OPTS = '-Xmx768m'
    }

    stages {
        stage('Preflight') {
            steps {
                sh '''
                    set -eu
                    java -version
                    node --version
                    docker version --format 'Docker {{.Server.Version}}'   # fails if Docker is not running
                    docker compose version
                '''
            }
        }

        stage('SonarQube: stop before tests') {
            steps {
                // A SonarQube left running (by hand, or by an aborted build) would share the 3.8 GB Docker VM with the
                // Testcontainers MySQL and Keycloak. Stop it only: the container and its volumes stay, and `stop` is a
                // no-op (exit 0) when it is already stopped or was never created. It is started again for the analysis.
                sh "${SONAR_COMPOSE} stop sonarqube"
            }
        }

        stage('Backend: build, test, coverage') {
            steps {
                // All modules; unit, controller and Testcontainers integration tests; JaCoCo report per module.
                sh './mvnw -B -ntp verify'
                // Testcontainers tests are skipped (not failed) without Docker: never accept a green build with skips.
                sh '''
                    set -eu
                    count=$(ls services/*/target/surefire-reports/TEST-*.xml 2>/dev/null | wc -l | tr -d ' ')
                    if [ "$count" -eq 0 ]; then
                        echo "No backend test reports found. Failing the build." >&2
                        exit 1
                    fi
                    if grep -l 'skipped="[1-9]' services/*/target/surefire-reports/TEST-*.xml; then
                        echo "Backend tests were skipped (Docker unavailable?). Failing the build." >&2
                        exit 1
                    fi
                    echo "$count backend test reports, none skipped"
                '''
            }
            post {
                always {
                    junit allowEmptyResults: false, testResults: 'services/*/target/surefire-reports/TEST-*.xml'
                    archiveArtifacts allowEmptyArchive: true, artifacts: 'services/*/target/site/jacoco/**'
                }
            }
        }

        stage('Release test resources') {
            steps {
                // Testcontainers removes its containers when the test JVM exits; remove any leftovers by their
                // Testcontainers label only (never MySQL, Keycloak or other containers).
                sh '''
                    set -eu
                    leftovers=$(docker ps -aq --filter label=org.testcontainers=true)
                    if [ -n "$leftovers" ]; then docker rm -f $leftovers; fi
                    echo "Testcontainers left running: $(docker ps -q --filter label=org.testcontainers=true | wc -l | tr -d ' ')"
                '''
            }
        }

        stage('Frontend: install') {
            steps {
                dir('frontend') {
                    sh 'npm ci --no-audit --no-fund'
                }
            }
        }

        stage('Frontend: typecheck') {
            steps {
                dir('frontend') {
                    sh 'npm run typecheck'
                }
            }
        }

        stage('Frontend: tests and coverage') {
            steps {
                dir('frontend') {
                    sh 'npm run test:ci'
                }
            }
            post {
                always {
                    junit allowEmptyResults: false, testResults: 'frontend/test-results/junit.xml'
                }
            }
        }

        stage('Frontend: build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('SonarQube: start') {
            steps {
                // Waits until the container's health check reports SonarQube UP (first start: 1-2 minutes).
                sh "${SONAR_COMPOSE} up -d --wait --wait-timeout 420 sonarqube"
            }
        }

        // Quality Gates (DEC-020): each scanner waits for its own project's gate (sonar.qualitygate.wait) and exits
        // non-zero when the gate fails or is not computed within 600 s, which fails the stage and the build. No
        // SonarQube webhook is involved: SonarQube blocks webhooks to private addresses such as host.docker.internal,
        // and sonar.validateWebhooks stays enabled.

        stage('SonarQube: backend analysis and Quality Gate') {
            steps {
                withSonarQubeEnv('sonarqube-local') {
                    // The token reaches the scanner through the environment only (never on the command line).
                    sh '''
                        SONAR_TOKEN="$SONAR_AUTH_TOKEN" ./mvnw -B -ntp \
                          org.sonarsource.scanner.maven:sonar-maven-plugin:5.9.0.7382:sonar \
                          -Dsonar.host.url="$SONAR_HOST_URL" \
                          -Dsonar.projectKey=zayora-backend \
                          -Dsonar.projectName="ZAYORA backend" \
                          -Dsonar.qualitygate.wait=true \
                          -Dsonar.qualitygate.timeout=600
                    '''
                }
            }
        }

        stage('SonarQube: frontend analysis and Quality Gate') {
            steps {
                withSonarQubeEnv('sonarqube-local') {
                    dir('frontend') {
                        sh '''
                            SONAR_TOKEN="$SONAR_AUTH_TOKEN" npx --no-install sonar-scanner-npm \
                              -Dsonar.host.url="$SONAR_HOST_URL" \
                              -Dsonar.qualitygate.wait=true \
                              -Dsonar.qualitygate.timeout=600
                        '''
                    }
                }
            }
        }

        stage('SonarQube: stop') {
            steps {
                // Free the memory before anything else runs (the post block stops it again if a stage failed).
                sh "${SONAR_COMPOSE} stop sonarqube"
            }
        }

        stage('Docker images') {
            // Phase 3 adds the Dockerfiles; until then this stage is skipped. It only runs after every check passed.
            when {
                expression { sh(returnStatus: true, script: 'ls services/*/Dockerfile frontend/Dockerfile 2>/dev/null | grep -q .') == 0 }
            }
            steps {
                sh '''
                    set -eu
                    tag=$(git rev-parse --short HEAD)
                    for dockerfile in services/*/Dockerfile frontend/Dockerfile; do
                        [ -f "$dockerfile" ] || continue
                        name=$(basename "$(dirname "$dockerfile")")
                        docker build -t "zayora/$name:$tag" -f "$dockerfile" "$(dirname "$dockerfile")"
                    done
                '''
            }
        }
    }

    post {
        always {
            // Always stop SonarQube (only that service, through its own compose file) and remove test leftovers,
            // also when a stage failed or the build was aborted.
            sh """
                ${SONAR_COMPOSE} stop sonarqube || true
                leftovers=\$(docker ps -aq --filter label=org.testcontainers=true)
                if [ -n "\$leftovers" ]; then docker rm -f \$leftovers || true; fi
            """
        }
        cleanup {
            cleanWs(deleteDirs: true, notFailBuild: true)
        }
    }
}
