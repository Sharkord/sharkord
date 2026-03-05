import { expect, test } from '@playwright/test';
import { TestId } from '@sharkord/shared';

test.describe('Connect Screen', () => {
  test('should display the connect screen with all essential elements', async ({
    page
  }) => {
    await page.goto('/');

    const logo = page.getByAltText('Sharkord');
    await expect(logo).toBeVisible();

    await expect(page.getByText('Identity')).toBeVisible();
    await expect(page.getByText('Password')).toBeVisible();

    const identityInput = page.getByTestId(TestId.CONNECT_IDENTITY_INPUT);
    const passwordInput = page.getByTestId(TestId.CONNECT_PASSWORD_INPUT);
    await expect(identityInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    const connectButton = page.getByTestId(TestId.CONNECT_BUTTON);
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toBeDisabled();
  });

  test('should enable the Connect button when identity and password are filled', async ({
    page
  }) => {
    await page.goto('/');

    const identityInput = page.getByTestId(TestId.CONNECT_IDENTITY_INPUT);
    const passwordInput = page.getByTestId(TestId.CONNECT_PASSWORD_INPUT);
    const connectButton = page.getByTestId(TestId.CONNECT_BUTTON);

    await identityInput.fill('testuser');
    await passwordInput.fill('testpassword');

    await expect(connectButton).toBeEnabled();
  });
});
