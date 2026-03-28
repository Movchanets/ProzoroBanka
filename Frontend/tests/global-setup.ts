import { execSync } from 'child_process';
import path from 'path';

/**
 * Global setup for Playwright tests.
 * Starts Docker containers (Postgres + Redis) before tests run.
 * Works in both local development and CI environments.
 */
async function globalSetup() {
 

  const repoRoot = path.resolve(process.cwd(), '..');

  console.log('[global-setup] Starting test containers...');

  // Use shared script for Docker container startup
  const scriptPath = path.resolve(repoRoot, 'scripts', 'start-test-containers.sh');

  try {
    execSync(`bash ${scriptPath}`, {
      cwd: repoRoot,
      stdio: 'inherit',
      timeout: 300_000,
    });
  } catch (err) {
    console.error('[global-setup] Failed to start Docker containers:', err);
    throw err;
  }

  console.log('[global-setup] All services are ready!');
}

export default globalSetup;
