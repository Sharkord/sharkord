import { defineConfig, devices } from '@playwright/test';

const SERVER_PORT = 4991;
const CLIENT_PORT = 5173;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.pw.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

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
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    },
    {
      command: 'bun dev',
      cwd: '../../apps/client',
      port: CLIENT_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 15_000
    }
  ]
});
