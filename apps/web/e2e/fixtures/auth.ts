import { test as base, expect } from '@playwright/test';

/**
 * Logs in via the API (faster + more reliable than driving the form) and
 * surfaces an `authedPage` already cookied for /inbox.
 *
 * Requires E2E_USER_EMAIL + E2E_USER_PASSWORD. Seed via `pnpm seed` first.
 */
export const test = base.extend<{
  authedPage: typeof base extends never ? never : import('@playwright/test').Page;
}>({
  authedPage: async ({ page, request, baseURL }, use) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) {
      throw new Error('Set E2E_USER_EMAIL + E2E_USER_PASSWORD for E2E auth.');
    }
    const res = await request.post(`${baseURL}/api/backend/auth/login`, {
      data: { email, password },
    });
    expect(res.ok()).toBe(true);
    // Replay cookies the API set onto the browser context.
    const setCookies = res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie');
    if (setCookies.length === 0) {
      throw new Error('Login did not return a session cookie.');
    }
    await use(page);
  },
});

export { expect };
