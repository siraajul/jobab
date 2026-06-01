import { test, expect } from '@playwright/test';

/**
 * The flagship inbox flow: login → see a conversation → take over → send a
 * reply. Seeds itself via the API rather than depending on a fixed DB row.
 *
 * Skipped unless E2E_USER_EMAIL + E2E_USER_PASSWORD are set so PRs without
 * those secrets don't fail.
 */
const HAVE_CREDS = !!(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test.describe('Inbox flow', () => {
  test.skip(!HAVE_CREDS, 'E2E creds not configured');

  test.beforeEach(async ({ page, request, baseURL }) => {
    const res = await request.post(`${baseURL}/api/backend/auth/login`, {
      data: { email: process.env.E2E_USER_EMAIL, password: process.env.E2E_USER_PASSWORD },
    });
    expect(res.ok()).toBe(true);
    await page.goto('/inbox');
  });

  test('login → open conversation → take over → send reply', async ({ page }) => {
    // 1. Inbox loads and shows at least one conversation row. (Seed `pnpm seed`
    //    inserts a starter conversation.)
    await expect(page.getByRole('main')).toBeVisible();
    const firstConv = page.locator('[data-testid="conversation-row"]').first();
    await expect(firstConv).toBeVisible({ timeout: 10_000 });
    await firstConv.click();

    // 2. Take over from the AI.
    const takeOver = page.getByRole('button', { name: /take over/i });
    await expect(takeOver).toBeVisible();
    await takeOver.click();
    await expect(page.getByRole('button', { name: /hand back/i })).toBeVisible();

    // 3. Send a reply. The composer's textarea has accessible label "Reply".
    const composer = page.getByRole('textbox', { name: /reply/i });
    await composer.fill('Apnar order ta dekhechi. 2-3 kaj diner moddhe pathiye debo.');
    await page.getByRole('button', { name: /send/i }).click();

    // 4. The new outbound bubble appears in the thread.
    await expect(page.getByText(/2-3 kaj diner moddhe/i)).toBeVisible({ timeout: 5_000 });
  });
});
