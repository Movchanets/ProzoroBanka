#!/bin/bash
# Start Docker containers for testing (full stack)
# Usage: ./scripts/start-test-containers.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

COMPOSE_CMD="docker compose --env-file Frontend/.env.test -f docker-compose.yml -f docker-compose.ci.yml"

# Start containers
echo "[start-test-containers] Starting Docker containers (Postgres + Redis + API + Frontend)..."
cd "$REPO_ROOT"
$COMPOSE_CMD up -d --build postgres redis api frontend

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
