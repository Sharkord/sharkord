import { expect, test, type Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';

const loginAs = async (page: Page, identity: string, password: string) => {
  await page.goto('/');
  await page.getByTestId(TestId.CONNECT_IDENTITY_INPUT).fill(identity);
  await page.getByTestId(TestId.CONNECT_PASSWORD_INPUT).fill(password);
  await page.getByTestId(TestId.CONNECT_BUTTON).click();
  await page.getByTestId(TestId.SERVER_VIEW).waitFor();
};

export { expect, loginAs, test };
