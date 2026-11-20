# Continuous integration (local Jenkins + SonarQube)

> Status: written 2026-11-19 for DEC-020; revised 2026-11-20 (Quality Gate checked by the scanners, no webhook).
> Describes the **local** CI setup on one developer machine (MacBook Air M2, Apple silicon, 8 GB RAM). It is not a
> production CI service; see [§10 Limits](#10-limits-and-what-this-is-not).

ZAYORA's pipeline is the [`Jenkinsfile`](../Jenkinsfile) at the repository root. It runs on a native Jenkins on the
host and uses a SonarQube that runs in Docker from [`infra/sonarqube/compose.yaml`](../infra/sonarqube/compose.yaml).
Neither is needed to build, test or run ZAYORA: everything the pipeline runs also works from a terminal (see
[README → Running the tests](../README.md#running-the-tests)).

Contents:

1. [Prerequisites](#1-prerequisites)
2. [Install and start Jenkins (macOS, Apple silicon)](#2-install-and-start-jenkins-macos-apple-silicon)
3. [Plugins](#3-plugins)
4. [SonarQube](#4-sonarqube)
5. [Connect Jenkins and SonarQube](#5-connect-jenkins-and-sonarqube)
6. [The pipeline job](#6-the-pipeline-job)
7. [Pipeline stages and failure behaviour](#7-pipeline-stages-and-failure-behaviour)
8. [Starting and stopping everything](#8-starting-and-stopping-everything)
9. [Running CI on an 8 GB machine](#9-running-ci-on-an-8-gb-machine)
10. [Limits, and what this is not](#10-limits-and-what-this-is-not)

---

## 1. Prerequisites

| Tool | Version used | Notes |
|---|---|---|
| Java | Temurin **21** (`/usr/libexec/java_home -v 21`) | All backend modules target Java 21. Jenkins also runs on it. |
| Maven | **Maven Wrapper** (`./mvnw`, Maven 3.9.16) | No separate Maven install. The wrapper downloads Maven on first use into `~/.m2/wrapper`. |
| Node.js / npm | Node 23.11, npm 10.9 (the versions on the development machine) | `frontend/package.json` declares no `engines` yet. Node 22 LTS or newer is expected to work but has not been tested. |
| Docker Desktop | Docker VM with **3.8 GB** memory | The backend tests use Testcontainers (MySQL, Keycloak); SonarQube runs in Docker. |
| Homebrew | `/opt/homebrew` | Used only to install Jenkins. |

Docker Desktop on this machine puts the CLI in `~/.docker/bin` and the socket in `~/.docker/run/docker.sock`. Jenkins
must see both, so the start script below sets `PATH` and `HOME` explicitly. Jenkins does **not** inherit your shell
profile.

## 2. Install and start Jenkins (macOS, Apple silicon)

Install the LTS release with Homebrew:

```sh
brew install jenkins-lts        # 2.580.2 at the time of writing; also installs openjdk@21 as a dependency
```

Don't start it with `brew services`. The Homebrew service doesn't know about Docker Desktop's CLI path, the socket
under `$HOME`, or the options below. Start it with a small script **outside the repository** instead. It holds
machine paths only, never secrets. For example, `~/jenkins/start-jenkins.sh`:

```sh
#!/bin/sh
# Local Jenkins for ZAYORA (docs/ci.md). Listens on 127.0.0.1 only.
set -eu
export HOME="/Users/<you>"
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
export PATH="$JAVA_HOME/bin:$HOME/.docker/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export JENKINS_HOME="$HOME/.jenkins"

exec java -Xms256m -Xmx512m \
  -Dhudson.plugins.git.GitSCM.ALLOW_LOCAL_CHECKOUT=true \
  -jar "$(brew --prefix jenkins-lts)/libexec/jenkins.war" \
  --httpListenAddress=127.0.0.1 --httpPort=8088
```

Why each part matters:

- **`-Xms256m -Xmx512m`** caps the Jenkins controller's memory (see §9).
- **`ALLOW_LOCAL_CHECKOUT=true`** lets the job check out the repository from a local `file://` path. Recent Git plugin
  versions refuse that by default. It is acceptable on a single-user machine that listens on localhost only.
- **`127.0.0.1:8088`** keeps Jenkins off the network and away from Keycloak (8080), the gateway (8090) and the
  services.

First start: run the script, open <http://localhost:8088>, unlock Jenkins with the initial admin password from
`~/.jenkins/secrets/initialAdminPassword` (read it yourself, don't paste it anywhere), create your own admin user and
choose **Select plugins to install** (§3).

Then, under **Manage Jenkins → Nodes → Built-In Node**, set **Number of executors = 1**. One build at a time is part
of the memory plan, and the `Jenkinsfile` also sets `disableConcurrentBuilds()`.

## 3. Plugins

| Plugin | Needed for |
|---|---|
| Pipeline (`workflow-aggregator`) | Declarative `Jenkinsfile` |
| Git (`git`) | Checking out the repository |
| Credentials Binding (`credentials-binding`) | Secret text credentials |
| SonarQube Scanner (`sonar`) | `withSonarQubeEnv` (server URL and token for the scanners). The Quality Gate is checked by the scanners themselves (§5.3) |
| JUnit (`junit`) | Backend (Surefire) and frontend (Node test runner) test reports |
| Timestamper (`timestamper`) | `timestamps()` |
| Workspace Cleanup (`ws-cleanup`) | `cleanWs` in `post { cleanup }` |
| Pipeline: Stage View (`pipeline-stage-view`) | Stage overview on the job page (optional, nice to have) |
| Coverage (`coverage`) | Optional. Coverage is read by SonarQube; the `Jenkinsfile` doesn't use this plugin |

Install no others. Each plugin costs controller memory.

## 4. SonarQube

**SonarQube Community Build 26.11** (`sonarqube:26.11.0.134175-community`) in Multi-Quality Rule (MQR) mode, run by
[`infra/sonarqube/compose.yaml`](../infra/sonarqube/compose.yaml) as compose project `foodiehub-sonar`, container
`foodiehub-sonarqube`, behind the profile `sonar`:

- Bound to **127.0.0.1:9000** only.
- Heaps: Elasticsearch 512 MB, web 128–384 MB, Compute Engine 128–384 MB. Hard container limit `mem_limit: 2560m`.
- Data, extensions and logs live in named volumes (`sonarqube-data`, `sonarqube-extensions`, `sonarqube-logs`), so
  analyses, projects, tokens and Quality Gates survive `stop`/`start`.
- Health check on `/api/system/status`, so `up --wait` returns only when SonarQube reports `UP`.

> **Evaluation-only database.** This SonarQube uses its **embedded H2 database**. SonarSource supports H2 for
> evaluation only. It can't be upgraded to a newer SonarQube version, and it isn't for production use. That's
> acceptable for one developer's local quality checks, where the analysis history can be rebuilt by re-running the
> pipeline. A shared or long-lived SonarQube would need PostgreSQL (or SonarQube Cloud) instead. See DEC-020.

The compose file reads nothing from `.env` and doesn't touch MySQL or Keycloak.

**Projects:**

| Project key | Analysed by | Coverage source |
|---|---|---|
| `zayora-backend` | Maven scanner by coordinates: `org.sonarsource.scanner.maven:sonar-maven-plugin:5.9.0.7382:sonar` | JaCoCo XML per module (`target/site/jacoco/jacoco.xml`, created by `./mvnw verify`) |
| `zayora-frontend` | `@sonar/scan` 5.1.0 (dev dependency; binary `sonar-scanner-npm`), settings in [`frontend/sonar-project.properties`](../frontend/sonar-project.properties) | `frontend/coverage/lcov.info` from `npm run test:ci` |

**Quality Gate:** both projects use a project-specific gate that the owner created and assigned in the SonarQube UI
(P2.2). The built-in **Sonar way** gate is left unchanged. Check the assignment under **Project Settings → Quality
Gate** before the first Jenkins run. **New code** uses *Previous version* (inherited instance default). The baseline
is the first analysis on 2026-11-19.

**Analysis token:** a **Global Analysis Token** (`sqa_…`), created under **My Account → Security**. It's used in two
places only:

- the Jenkins credential `sonarqube-token` (§5)
- optionally, `SONAR_TOKEN` in your local `.env` for analyses run by hand ([`.env.example`](../.env.example) documents
  the name with a placeholder)

Never put it on a command line, in `sonar-project.properties`, in a POM or in the repository.

## 5. Connect Jenkins and SonarQube

### 5.1 Credentials (Manage Jenkins → Credentials → System → Global)

| ID | Kind | Value |
|---|---|---|
| `sonarqube-token` | Secret text | The SonarQube analysis token. **Required:** both scanners use it to send the analysis and to read the Quality Gate result |

No other credential is needed. An earlier draft of this setup also used a `sonarqube-webhook-secret` credential. It is
**no longer required** (§5.3). If you already created it, it's unused and can be deleted by hand under **Manage
Jenkins → Credentials** whenever convenient. Nothing in the pipeline refers to it.

### 5.2 SonarQube server (Manage Jenkins → System → SonarQube servers)

- Tick **Environment variables** (*Enable injection of SonarQube server configuration as build environment variables*).
- **Name:** `sonarqube-local`. The `Jenkinsfile` refers to this exact name.
- **Server URL:** `http://localhost:9000`
- **Server authentication token:** `sonarqube-token`
- Leave **Advanced → Webhook Secret** empty.

`withSonarQubeEnv('sonarqube-local')` then provides `SONAR_HOST_URL` and `SONAR_AUTH_TOKEN` to the analysis steps. The
`Jenkinsfile` passes the token to the scanners only as the environment variable `SONAR_TOKEN`, never as a `-D`
argument, so it doesn't appear in process lists. Jenkins masks it in the console log.

### 5.3 Quality Gate check (scanner polling, no webhook)

Each scanner checks its own project's Quality Gate. Both scanner commands pass:

- `-Dsonar.qualitygate.wait=true`: after uploading the analysis, the scanner keeps asking SonarQube (with the same
  token) until the background analysis task is processed, then reads the gate status.
- `-Dsonar.qualitygate.timeout=600`: it waits at most **600 seconds** (10 minutes).

The scanner exits non-zero, which fails its Jenkins stage and the build, when:

- the gate **fails**,
- the gate isn't computed within 600 seconds, or
- the analysis task fails in SonarQube.

A passing gate lets the stage succeed. The log shows the gate status and a link to the project dashboard.

**No SonarQube webhook is used, and none should be created.** Jenkins' webhook-based `waitForQualityGate` would need
SonarQube to call `http://host.docker.internal:8088/…`. Inside the container, Docker Desktop resolves that name to a
private address, and SonarQube 26.11 rejects webhooks to loopback, private, link-local and similar addresses. The only
way around that is the global switch `sonar.validateWebhooks`, which turns this SSRF protection off for every webhook
(there is no allowlist). It stays **enabled** (the default); see DEC-020.

## 6. The pipeline job

1. **New Item → Pipeline**, name `zayora`.
2. **Pipeline → Definition:** *Pipeline script from SCM*. **SCM:** Git.
   **Repository URL:** `file:///Users/<you>/…/foodiehub` (the local clone). **Branch:** the branch to build, e.g.
   `*/feat/cp1-restaurant-service`. **Script Path:** `Jenkinsfile`.
3. Leave triggers empty and start builds by hand (**Build Now**). There is no public URL for GitHub to call, and
   polling would only spend memory.

> Jenkins builds **committed** code only. It checks out the branch from Git, so uncommitted changes in your working
> tree, including an uncommitted `Jenkinsfile`, are not part of the build.

The job needs no `.env`. The backend tests start their own MySQL and Keycloak through Testcontainers. The only secret
the pipeline uses is the SonarQube token from the Jenkins credential store.

## 7. Pipeline stages and failure behaviour

The order is chosen so that SonarQube and the test containers never run at the same time (§9).

| # | Stage | What it runs | Fails the build when |
|---|---|---|---|
| 1 | Preflight | `java -version`, `node --version`, `docker version`, `docker compose version` | A tool is missing or Docker isn't running |
| 2 | SonarQube: stop before tests | `docker compose … stop sonarqube`, so a SonarQube left running doesn't compete with the tests for memory. Stops only; no container or volume is removed; exit 0 when it isn't running | Docker itself fails |
| 3 | Backend: build, test, coverage | `./mvnw -B -ntp verify` (all modules, Testcontainers integration tests, JaCoCo), then a guard over the Surefire reports | Compilation or test failure, **no test reports at all**, or **any skipped test** (Testcontainers skips tests when Docker is unreachable, and that must not look green) |
| 4 | Release test resources | Removes leftover containers labelled `org.testcontainers=true` (only those, never MySQL, Keycloak or SonarQube) | Docker can't remove a leftover container |
| 5 | Frontend: install | `npm ci --no-audit --no-fund` | Lockfile out of sync or install failure |
| 6 | Frontend: typecheck | `npm run typecheck` (`tsc --noEmit`) | Type errors |
| 7 | Frontend: tests and coverage | `npm run test:ci` (Node test runner: lcov + JUnit) | A test fails |
| 8 | Frontend: build | `npm run build` | Build fails |
| 9 | SonarQube: start | `docker compose … up -d --wait --wait-timeout 420 sonarqube` | SonarQube isn't healthy within 7 minutes |
| 10 | SonarQube: backend analysis and Quality Gate | Maven scanner (§4) with `sonar.qualitygate.wait=true`, `sonar.qualitygate.timeout=600` (§5.3) | Scanner error, `zayora-backend` gate **failed**, or no gate result within 600 s |
| 11 | SonarQube: frontend analysis and Quality Gate | `npx --no-install sonar-scanner-npm` in `frontend/`, same two properties | Scanner error, `zayora-frontend` gate **failed**, or no gate result within 600 s |
| 12 | SonarQube: stop | `docker compose … stop sonarqube` | Docker itself fails |
| 13 | Docker images | `docker build` per `services/*/Dockerfile` and `frontend/Dockerfile`, tagged `zayora/<name>:<short-sha>` | **Skipped** until phase 3 adds Dockerfiles. Runs only after every check passed |

The JUnit reports of stages 3 and 7 are published even when tests fail, and the backend JaCoCo HTML reports are
archived with the build.

**Always, after every build** (`post { always }`), including failed and aborted builds: SonarQube is stopped (only
that service, through its own compose file), and leftover Testcontainers containers are removed. Then
`post { cleanup }` wipes the workspace.

The whole build has a 60-minute timeout. A Quality Gate failure stops the pipeline at that analysis stage, so later
stages (the frontend analysis after a failed backend gate, and Docker images) don't run.

## 8. Starting and stopping everything

| | Start | Stop |
|---|---|---|
| Jenkins | `~/jenkins/start-jenkins.sh` (foreground; or run it in its own terminal tab) | `Ctrl+C` in that terminal, or **Manage Jenkins → Prepare for Shutdown**, then stop |
| SonarQube | `docker compose -f infra/sonarqube/compose.yaml --profile sonar up -d --wait sonarqube` | `docker compose -f infra/sonarqube/compose.yaml --profile sonar stop sonarqube` |

Notes:

- During a pipeline run you don't need to start or stop SonarQube yourself. The pipeline stops it before the tests,
  starts it for the analysis and stops it again afterwards. Start it by hand only to look at results in the UI
  (<http://localhost:9000>), and stop it when you're done.
- Use `stop`, not `down -v`. `down -v` deletes the volumes and with them every analysis, token and gate.
- Docker Desktop must be running for both the tests and SonarQube. On this machine it has stopped itself between runs
  before; Preflight catches that.

## 9. Running CI on an 8 GB machine

The machine has 8 GB of RAM, of which 3.8 GB is given to the Docker VM. The pipeline is built around that:

- **Never SonarQube and the test containers together.** The Testcontainers MySQL and Keycloak need most of the Docker
  VM, and SonarQube is capped at 2.5 GB. The pipeline stops SonarQube before the tests and starts it only after the
  test containers are gone.
- **One build at a time.** One executor and `disableConcurrentBuilds()`.
- **Capped JVMs:** Jenkins controller `-Xmx512m`; Maven `MAVEN_OPTS=-Xmx768m`. Surefire's forked test JVMs are not
  capped yet. Their peak memory will be measured during the first Jenkins run before deciding on a limit.
- **Close what you don't need before a build:** the local Keycloak, the services, the Vite dev server and browser tabs
  free a lot. The pipeline doesn't need the local MySQL or Keycloak (Testcontainers starts its own), but it doesn't
  stop them either. Stopping them is up to you.
- **Expect the first run to be slow:** Maven and npm download dependencies, and Docker pulls the MySQL, Keycloak and
  SonarQube images (about 1 GB for SonarQube). Later runs use the caches in `~/.m2`, `~/.npm` and Docker.

If a build is killed for lack of memory (exit 137, or Docker Desktop restarts), check that SonarQube wasn't running
during the test stage. Then raise the Docker VM memory only if the other apps can spare it.

## 10. Limits, and what this is not

- **Local only.** Jenkins and SonarQube listen on 127.0.0.1. Nothing is exposed to the internet, and GitHub can't
  trigger builds.
- **Not production-grade SonarQube.** It uses the embedded H2 database (evaluation only, no upgrades), and the history
  lives in a Docker volume on one laptop.
- **Builds committed code only** (§6).
- **No deployment.** The pipeline builds and checks. Image building starts in phase 3; publishing and deployment
  belong to phases 3–4.
