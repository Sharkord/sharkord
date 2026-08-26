import { expect, type Locator, type Page } from '@playwright/test';

// the app treats anything within 120px of the end as "at the bottom" (isNearBottom in
// use-scroll-controller), so the tests judge it by the same rule rather than a number of
// their own
const BOTTOM_THRESHOLD = 120;

const WHEEL_STEP = 600;

type TScrollState = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  fromBottom: number;
};

const messagesContainer = (page: Page): Locator =>
  page.locator('[data-messages-container]');

const readScroll = (container: Locator): Promise<TScrollState> =>
  container.evaluate((element) => {
    const target = element as unknown as {
      scrollTop: number;
      scrollHeight: number;
      clientHeight: number;
    };

    return {
      scrollTop: target.scrollTop,
      scrollHeight: target.scrollHeight,
      clientHeight: target.clientHeight,
      fromBottom:
        target.scrollHeight - (target.scrollTop + target.clientHeight)
    };
  });

// real wheel input. writing scrollTop instead would work, but it also skips the event
// cadence the scroll handler actually sees, and hand-dispatching a 'scroll' event on top of
// the one the browser already fires makes the handler run twice per scroll
const wheelUp = (page: Page) => page.mouse.wheel(0, -WHEEL_STEP);

// the channel scrolls itself to the bottom on open and keeps re-applying that while late
// content settles. waiting for the position to stop moving means a test never starts
// measuring against a viewport that is still being adjusted
const waitForStableScroll = async (container: Locator) => {
  let previous = -1;

  await expect
    .poll(async () => {
      const { scrollTop } = await readScroll(container);
      const settled = scrollTop === previous;

      previous = scrollTop;

      return settled;
    })
    .toBe(true);
};

// wheels upward until the condition holds. the poll body scrolls on purpose: reaching the
// top takes an unknown number of wheel events because each older page makes the list longer
const wheelUpUntil = async (
  page: Page,
  container: Locator,
  condition: () => Promise<boolean>,
  timeout = 20_000
) => {
  await container.hover();

  await expect
    .poll(
      async () => {
        await wheelUp(page);

        return condition();
      },
      { timeout }
    )
    .toBe(true);
};

const expectAtBottom = async (container: Locator) => {
  await expect
    .poll(async () => (await readScroll(container)).fromBottom)
    .toBeLessThanOrEqual(BOTTOM_THRESHOLD);
};

// away from the bottom by more than a page, so a later reading cannot be confused with the
// view merely drifting a little
const scrollWellAwayFromBottom = async (page: Page, container: Locator) => {
  await wheelUpUntil(
    page,
    container,
    async () => (await readScroll(container)).fromBottom > 600
  );

  // mouse.wheel returns before the browser has applied the scroll, so reading straight after
  // it catches a position one wheel step out of date. anything using this as a baseline would
  // then see that step land later and blame whatever it was measuring
  await waitForStableScroll(container);

  return readScroll(container);
};

export {
  BOTTOM_THRESHOLD,
  expectAtBottom,
  messagesContainer,
  readScroll,
  scrollWellAwayFromBottom,
  waitForStableScroll,
  wheelUpUntil,
  type TScrollState
};
