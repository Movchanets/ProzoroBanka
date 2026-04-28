#!/bin/bash
# Cleanup test database data before Playwright run
# Usage: ./scripts/cleanup-test-db.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DB_NAME="${PLAYWRIGHT_TEST_DB:-prozoro_banka_ci}"

compose() {
	docker compose -f docker-compose.yml -f docker-compose.ci.yml "$@"
}

cd "$REPO_ROOT"

echo "[cleanup-test-db] Cleaning database '$DB_NAME'..."

compose exec -T postgres psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
DO
$$
DECLARE
  truncate_sql text;
BEGIN
  SELECT INTO truncate_sql
    'TRUNCATE TABLE ' ||
    string_agg(format('%I.%I', schemaname, tablename), ', ') ||
    ' RESTART IDENTITY CASCADE'
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename <> '__EFMigrationsHistory';

  IF truncate_sql IS NOT NULL THEN
    EXECUTE truncate_sql;
  END IF;
END
$$;
SQL

echo "[cleanup-test-db] Database cleanup completed."

echo "[cleanup-test-db] Cleaning uploads-test folder..."
# Remove all contents of uploads-test folder if it exists
if [ -d "Backend/src/ProzoroBanka.API/wwwroot/uploads-test" ]; then
    find "Backend/src/ProzoroBanka.API/wwwroot/uploads-test" -mindepth 1 -delete
fi

echo "[cleanup-test-db] Cleanup completed successfully."
