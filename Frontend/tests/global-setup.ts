import { execSync } from 'child_process';
import path from 'path';

/**
 * Global setup for Playwright tests.
 * Starts Docker containers (Postgres + Redis) before tests run.
 * Works in both local development and CI environments.
 */
async function globalSetup() {
  const repoRoot = path.resolve(process.cwd(), '..');
  const isCI = !!process.env.CI;

  console.log(`[global-setup] Starting in ${isCI ? 'CI' : 'local'} environment`);

  // Use shared script for Docker container startup
  const scriptPath = path.resolve(repoRoot, 'scripts', 'start-test-containers.sh');
  const ciFlag = isCI ? '--ci' : '';

  console.log('[global-setup] Starting Docker containers (Postgres + Redis)...');
  try {
    execSync(`bash ${scriptPath} ${ciFlag}`, {
      cwd: repoRoot,
      stdio: 'inherit',
      timeout: 120_000,
    });
  } catch (err) {
    console.error('[global-setup] Failed to start Docker containers:', err);
    throw err;
  }

  // Run EF migrations
  await runMigrations(repoRoot);

  console.log('[global-setup] All services are ready!');
}

/**
 * Run Entity Framework migrations
 */
async function runMigrations(repoRoot: string) {
  console.log('[global-setup] Running EF migrations...');
  try {
    execSync(
      'dotnet ef database update --project src/ProzoroBanka.Infrastructure --startup-project src/ProzoroBanka.API',
      {
        cwd: path.resolve(repoRoot, 'Backend'),
        stdio: 'inherit',
        timeout: 120_000,
        env: {
          ...process.env,
          ASPNETCORE_ENVIRONMENT: 'Development',
          IS_PLAYWRIGHT_TESTS: 'true',
        },
      }
    );
    console.log('[global-setup] EF migrations completed!');
  } catch (err) {
    console.warn('[global-setup] EF migrations failed (may already be applied):', (err as Error).message);
    // Don't throw — migrations may already be applied
  }
}

export default globalSetup;
