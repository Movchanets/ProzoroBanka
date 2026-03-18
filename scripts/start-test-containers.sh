#!/bin/bash
# Start Docker containers for testing (Postgres + Redis)
# Usage: ./scripts/start-test-containers.sh [--ci]
#   --ci: Use CI-specific docker-compose override

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Determine if CI mode
if [[ "$1" == "--ci" ]] || [[ -n "$CI" ]]; then
    COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.ci.yml"
    echo "[start-test-containers] Starting in CI mode"
else
    COMPOSE_CMD="docker compose"
    echo "[start-test-containers] Starting in local mode"
fi

# Start containers
echo "[start-test-containers] Starting Docker containers (Postgres + Redis)..."
cd "$REPO_ROOT"
$COMPOSE_CMD up -d postgres redis

# Wait for Postgres to be ready
echo "[start-test-containers] Waiting for Postgres to be ready..."
timeout 60 bash -c "until $COMPOSE_CMD exec -T postgres pg_isready -U postgres; do sleep 1; done"
echo "[start-test-containers] Postgres is ready!"

# Wait for Redis to be ready
echo "[start-test-containers] Waiting for Redis to be ready..."
timeout 60 bash -c "until $COMPOSE_CMD exec -T redis redis-cli ping; do sleep 1; done"
echo "[start-test-containers] Redis is ready!"

echo "[start-test-containers] All services are ready!"
