import { execFileSync, execSync } from 'child_process';
import path from 'path';

function getBashExecutable() {
  if (process.platform !== 'win32') {
    return 'bash';
  }

  return 'C:\\Program Files\\Git\\bin\\bash.exe';
}

/**
 * Global setup for Playwright tests.
 * Starts Docker containers (Postgres + Redis) before tests run.
 * Works in both local development and CI environments.
 */
async function globalSetup() {
  const repoRoot = path.resolve(process.cwd(), '..');
  const composeCmd = 'docker compose -f docker-compose.yml -f docker-compose.ci.yml';
  const bashExecutable = getBashExecutable();

  console.log('[global-setup] Starting test containers...');

  // Use shared script for Docker container startup
  const startScriptPath = path.resolve(repoRoot, 'scripts', 'start-test-containers.sh');
  const cleanupScriptPath = path.resolve(repoRoot, 'scripts', 'cleanup-test-db.sh');

  try {
    execFileSync(bashExecutable, [startScriptPath], {
      cwd: repoRoot,
      stdio: 'inherit',
      timeout: 300_000,
    });

    console.log('[global-setup] Cleaning test database before run...');
    execFileSync(bashExecutable, [cleanupScriptPath], {
      cwd: repoRoot,
      stdio: 'inherit',
      timeout: 180_000,
    });

    console.log('[global-setup] Restarting API to re-seed baseline data...');
    execSync(`${composeCmd} restart api`, {
      cwd: repoRoot,
      stdio: 'inherit',
      timeout: 120_000,
    });

    console.log('[global-setup] Waiting for API after restart...');
    execFileSync(
      bashExecutable,
      [
        '-lc',
        "for i in {1..60}; do code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5188/api/auth/login); if echo $code | grep -Eq '^(200|400|401|405)$'; then exit 0; fi; sleep 2; done; exit 1",
      ],
      {
        cwd: repoRoot,
        stdio: 'inherit',
        timeout: 140_000,
      }
    );
  } catch (err) {
    console.error('[global-setup] Failed to prepare test environment:', err);
    throw err;
  }

  console.log('[global-setup] Test environment is ready!');
}

export default globalSetup;
