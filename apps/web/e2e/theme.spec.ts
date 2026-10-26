import { test, expect } from '@playwright/test';

for (const saved of ['light', 'dark', 'invalid']) {
  test(`saved ${saved} theme hydrates cleanly on login and reload`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        /hydrat|server rendered HTML|didn't match/i.test(message.text())
      )
        errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((value) => localStorage.setItem('jobab-theme', value), saved);
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
    const expected = saved === 'dark' ? 'dark' : 'light';
    await expect(page.locator('html')).toHaveClass(`theme-${expected}`);
    await expect(page.locator('body')).not.toHaveClass(/theme-/);
    // Typing exercises the hydrated React tree, rather than only asserting SSR.
    await page.getByLabel('Email', { exact: true }).fill('theme-check@example.test');
    await page.getByLabel('Password', { exact: true }).fill('theme-check-password');
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
    await page.reload();
    await expect(page.locator('html')).toHaveClass(`theme-${expected}`);
    expect(errors).toEqual([]);
  });
}
