import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests run against the PRODUCTION build served with the real
 * security headers (scripts/serve-dist.mjs applies public/_headers), so the
 * strict CSP is enforced during every test.
 *
 * Primary targets are Chromium + Firefox (spec §14). This environment ships
 * a preinstalled Chromium only; Firefox runs are pending on the owner's
 * machine — see docs/testing.md.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
  },
  webServer: {
    command: 'npm run build && node scripts/serve-dist.mjs --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
