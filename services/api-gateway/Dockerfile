# ZAYORA api-gateway image (Phase 3). Packages the Spring Boot jar that the build already produced
# (./mvnw package or the Jenkins pipeline); nothing is compiled here.
#   docker build -t zayora/api-gateway services/api-gateway
# Configuration (database, Keycloak, Consul, secrets) comes from environment variables at runtime; none is baked in.
FROM eclipse-temurin:21.0.13_9-jre-alpine

# Unprivileged user with a fixed id, so volumes and orchestrators can rely on it.
RUN addgroup -S -g 10001 app && adduser -S -D -H -u 10001 -G app app

WORKDIR /app
# Only the executable Spring Boot jar (the plain jar is *.jar.original; .dockerignore sends nothing else).
COPY --chown=app:app target/*.jar app.jar

USER 10001:10001
EXPOSE 8090

# Size the heap from the container's memory limit and exit (so it can be restarted) on OutOfMemoryError.
# Override at runtime with -e JAVA_TOOL_OPTIONS=... if needed.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
