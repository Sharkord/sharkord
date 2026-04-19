import { defineConfig, devices } from '@playwright/test';
import { e2eDataPath } from './tests/statics';

const SERVER_PORT = 4991;
const CLIENT_PORT = 5173;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.pw.ts',
  globalSetup: './tests/setup/global.setup.ts',
  globalTeardown: './tests/setup/global.teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  testIgnore: ['**/fixtures/**', '**/__tests__/seed-e2e.ts'],

  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: 'on-first-retry'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  webServer: [
    {
      command: 'bun dev',
      cwd: '../../apps/server',
      port: SERVER_PORT,
      reuseExistingServer: false,
      timeout: 30_000,
      stdout: 'ignore',
      stderr: 'ignore',
      env: {
        SHARKORD_DATA_PATH: e2eDataPath,
        IS_E2E: 'true'
      }
    },
    {
      command: 'bun dev',
      cwd: '../../apps/client',
      port: CLIENT_PORT,
      stderr: 'ignore',
      stdout: 'ignore',
      reuseExistingServer: false,
      timeout: 15_000
    }
  ]
});
