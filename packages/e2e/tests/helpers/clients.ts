import type { Browser, Page } from '@playwright/test';
import { loginAs } from '../fixtures';

// a second logged-in browser for the tests that need one user to act and another to watch.
// the context is always closed, including when the body throws, so a failing assertion
// cannot leave a browser behind and stall the run
const withSecondClient = async (
  browser: Browser,
  identity: string,
  password: string,
  run: (page: Page) => Promise<void>
) => {
  const context = await browser.newContext();

  try {
    const page = await context.newPage();

    await loginAs(page, identity, password);
    await run(page);
  } finally {
    await context.close().catch(() => {
      // already gone, nothing to clean up
    });
  }
};

export { withSecondClient };
