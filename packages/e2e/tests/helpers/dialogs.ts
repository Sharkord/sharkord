import type { Page } from '@playwright/test';

// every confirmation autofocuses its confirm button, so enter is enough. waiting for the
// dialog first is what makes that safe: a blind press can land before the dialog mounts and
// then nothing happens, which shows up much later as the action simply not having run
const confirmDialog = async (page: Page) => {
  await page.getByRole('alertdialog').waitFor();
  await page.keyboard.press('Enter');
};

export { confirmDialog };
