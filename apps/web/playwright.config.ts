import { defineConfig, devices } from '@playwright/test';

/**
 * Baseline Playwright config for Jobab web. Assumes the backend (3000) and
 * web (3001) are already running locally (`pnpm infra:up && pnpm dev` at the
 * repo root). CI should boot them as separate jobs and pass BASE_URL.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
