import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './e2e',
  outputDir: path.resolve(__dirname, '../test-screenshots/test-results'),
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['html', { outputFolder: path.resolve(__dirname, '../test-screenshots/html-report') }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3099',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx tsx e2e/serve-harness.ts',
    port: 3099,
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
