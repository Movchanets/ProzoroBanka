#!/bin/bash
# Start Docker containers for testing (full stack)
# Usage: ./scripts/start-test-containers.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.ci.yml"
SERVICES=(postgres redis api frontend)
FORCE_REBUILD_FLAG=false

if [[ "${1:-}" == "--rebuild" ]]; then
	FORCE_REBUILD_FLAG=true
fi

all_services_running=true
for service in "${SERVICES[@]}"; do
	container_id="$($COMPOSE_CMD ps -q "$service" 2>/dev/null || true)"
	if [[ -z "$container_id" ]]; then
		all_services_running=false
		break
	fi

	container_state="$(docker inspect -f '{{.State.Running}}' "$container_id" 2>/dev/null || echo false)"
	if [[ "$container_state" != "true" ]]; then
		all_services_running=false
		break
	fi
done

# Start containers
echo "[start-test-containers] Starting Docker containers (Postgres + Redis + API + Frontend)..."
cd "$REPO_ROOT"
if [[ "$FORCE_REBUILD_FLAG" == "true" || "${FORCE_DOCKER_BUILD:-false}" == "true" ]]; then
	echo "[start-test-containers] FORCE_DOCKER_BUILD=true, rebuilding images..."
	$COMPOSE_CMD up -d --build "${SERVICES[@]}"
elif [[ "$all_services_running" == "true" ]]; then
	echo "[start-test-containers] Services are already running, skipping rebuild (--no-build)."
	$COMPOSE_CMD up -d --no-build "${SERVICES[@]}"
else
	echo "[start-test-containers] Some services are not running, starting with build."
	$COMPOSE_CMD up -d --build "${SERVICES[@]}"
fi

# Wait for Postgres to be ready
echo "[start-test-containers] Waiting for Postgres to be ready..."
timeout 60 bash -c "until $COMPOSE_CMD exec -T postgres pg_isready -U postgres; do sleep 1; done"
echo "[start-test-containers] Postgres is ready!"

# Wait for Redis to be ready
echo "[start-test-containers] Waiting for Redis to be ready..."
timeout 60 bash -c "until $COMPOSE_CMD exec -T redis redis-cli ping; do sleep 1; done"
echo "[start-test-containers] Redis is ready!"

# Wait for API to be ready
echo "[start-test-containers] Waiting for API to be ready..."
timeout 120 bash -c "until curl -s -o /dev/null -w '%{http_code}' http://localhost:5188/api/auth/login | grep -Eq '^(200|400|401|405)$'; do sleep 2; done"
echo "[start-test-containers] API is ready!"

# Wait for Frontend to be ready
echo "[start-test-containers] Waiting for Frontend to be ready..."
timeout 120 bash -c "until curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/ | grep -Eq '^(200|304)$'; do sleep 2; done"
echo "[start-test-containers] Frontend is ready!"

echo "[start-test-containers] All services are ready!"
