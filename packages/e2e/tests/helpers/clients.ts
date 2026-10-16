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

const withClients = async (
  browser: Browser,
  identities: string[],
  run: (pages: Page[]) => Promise<void>
) => {
  const contexts = await Promise.all(
    identities.map(() => browser.newContext())
  );

  try {
    const pages = await Promise.all(
      contexts.map((context) => context.newPage())
    );

    for (const [index, page] of pages.entries()) {
      await loginAs(page, identities[index]!, 'password123');
    }

    await run(pages);
  } finally {
    await Promise.all(
      contexts.map((context) =>
        context.close().catch(() => {
          // already gone, nothing to clean up
        })
      )
    );
  }
};

export { withClients, withSecondClient };
