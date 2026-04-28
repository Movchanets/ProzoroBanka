#!/bin/bash
# Start Docker containers for testing (full stack)
# Usage: ./scripts/start-test-containers.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SERVICES=(postgres redis api frontend)
FORCE_REBUILD_FLAG=false

compose() {
	docker compose -f docker-compose.yml -f docker-compose.ci.yml "$@"
}

wait_until() {
	local timeout_seconds="$1"
	shift
	local start_time=$SECONDS

	until "$@"; do
		if (( SECONDS - start_time >= timeout_seconds )); then
			return 1
		fi
		sleep 1
	done
}

if [[ "${1:-}" == "--rebuild" ]]; then
	FORCE_REBUILD_FLAG=true
fi

all_services_running=true
for service in "${SERVICES[@]}"; do
	container_id="$(compose ps -q "$service" 2>/dev/null || true)"
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
	compose up -d --build "${SERVICES[@]}"
elif [[ "$all_services_running" == "true" ]]; then
	echo "[start-test-containers] Services are already running, skipping rebuild (--no-build)."
	compose up -d --no-build "${SERVICES[@]}"
else
	echo "[start-test-containers] Some services are not running, starting with build."
	compose up -d --build "${SERVICES[@]}"
fi

# Wait for Postgres to be ready
echo "[start-test-containers] Waiting for Postgres to be ready..."
wait_until 60 compose exec -T postgres pg_isready -U postgres
echo "[start-test-containers] Postgres is ready!"

# Wait for Redis to be ready
echo "[start-test-containers] Waiting for Redis to be ready..."
wait_until 60 compose exec -T redis redis-cli ping
echo "[start-test-containers] Redis is ready!"

# Wait for API to be ready
echo "[start-test-containers] Waiting for API to be ready..."
wait_until 120 bash -lc "curl -s -o /dev/null -w '%{http_code}' http://localhost:5188/api/auth/login | grep -Eq '^(200|400|401|405)$'"
echo "[start-test-containers] API is ready!"

# Wait for Frontend to be ready
echo "[start-test-containers] Waiting for Frontend to be ready..."
wait_until 120 bash -lc "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ | grep -Eq '^(200|304)$'"
echo "[start-test-containers] Frontend is ready!"

echo "[start-test-containers] All services are ready!"
