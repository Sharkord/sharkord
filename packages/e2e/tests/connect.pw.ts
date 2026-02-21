import { expect, test } from '@playwright/test';

test.describe('Connect Screen', () => {
  test('should display the connect screen with all essential elements', async ({
    page
  }) => {
    await page.goto('/');

    const logo = page.getByAltText('Sharkord');
    await expect(logo).toBeVisible();

    await expect(page.getByText('Identity')).toBeVisible();
    await expect(page.getByText('Password')).toBeVisible();

    const inputs = page.locator('input');
    await expect(inputs).toHaveCount(2);

    await expect(inputs.nth(1)).toHaveAttribute('type', 'password');

    const connectButton = page.getByRole('button', { name: 'Connect' });
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toBeDisabled();
  });

  test('should enable the Connect button when identity and password are filled', async ({
    page
  }) => {
    await page.goto('/');

    const inputs = page.locator('input');
    const connectButton = page.getByRole('button', { name: 'Connect' });

    await inputs.nth(0).fill('testuser');
    await inputs.nth(1).fill('testpassword');

    await expect(connectButton).toBeEnabled();
  });
});
