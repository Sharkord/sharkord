import { expect, test } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { loginAs } from './fixtures';
import { INFINITE_SCROLL_CHANNEL, openChannel } from './helpers/channels';
import {
  getMockMessageNumbers,
  NEWEST_MOCK_MESSAGE,
  waitForNewestMockMessage
} from './helpers/messages';
import {
  messagesContainer,
  waitForStableScroll,
  wheelUpUntil
} from './helpers/scroll';

// loading older history: that it arrives, that it arrives in order, that leaving the channel
// gives the memory back, and that a link into the middle of the history lands somewhere
// sensible. where the viewport ends up is scroll-position.pw.ts's problem, not this file's

const PAGE_SIZE = 100;

test('scrolling up loads older messages and keeps the list ordered', async ({
  page
}) => {
  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, INFINITE_SCROLL_CHANNEL);
  await waitForNewestMockMessage(page);

  const container = messagesContainer(page);

  await waitForStableScroll(container);

  const firstPage = await getMockMessageNumbers(page);

  expect(firstPage.length).toBe(PAGE_SIZE);
  expect(Math.max(...firstPage)).toBe(NEWEST_MOCK_MESSAGE);

  const oldestOnFirstPage = Math.min(...firstPage);

  // counted by mock number rather than by rendered rows: the suite shares one server, so a
  // message another spec sends into this channel arrives live and would otherwise read as a
  // page having loaded
  await wheelUpUntil(
    page,
    container,
    async () =>
      Math.min(...(await getMockMessageNumbers(page))) < oldestOnFirstPage
  );

  const loaded = await getMockMessageNumbers(page);

  expect(loaded.length).toBeGreaterThan(firstPage.length);
  expect(Math.min(...loaded)).toBeLessThan(oldestOnFirstPage);

  // oldest first, top to bottom, with no page spliced in at the wrong end
  expect(loaded).toEqual([...loaded].sort((a, b) => a - b));

  // and contiguous: a gap would mean a page landed without its neighbours
  expect(Math.max(...loaded) - Math.min(...loaded) + 1).toBe(loaded.length);
});

test('leaving a channel releases everything but the newest page', async ({
  page
}) => {
  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, INFINITE_SCROLL_CHANNEL);
  await waitForNewestMockMessage(page);

  const container = messagesContainer(page);

  await waitForStableScroll(container);

  const oldestOnFirstPage = Math.min(...(await getMockMessageNumbers(page)));

  await wheelUpUntil(
    page,
    container,
    async () =>
      (await getMockMessageNumbers(page)).length > PAGE_SIZE * 2 &&
      Math.min(...(await getMockMessageNumbers(page))) < oldestOnFirstPage
  );

  const oldestBeforeLeaving = Math.min(...(await getMockMessageNumbers(page)));

  await openChannel(page, 'General');
  await openChannel(page, INFINITE_SCROLL_CHANNEL);
  await waitForNewestMockMessage(page);

  // back to a single page: the pages scrolled into memory are not still there. counted in
  // mock numbers because another spec's message may sit in the same page
  await expect
    .poll(async () => (await getMockMessageNumbers(page)).length)
    .toBeLessThanOrEqual(PAGE_SIZE);

  const afterReturn = await getMockMessageNumbers(page);

  expect(Math.min(...afterReturn)).toBeGreaterThan(oldestBeforeLeaving);
  expect(Math.max(...afterReturn)).toBe(NEWEST_MOCK_MESSAGE);
  expect(afterReturn).toEqual([...afterReturn].sort((a, b) => a - b));
});

test('jumping to an old message shows a bounded window and a way back', async ({
  page
}) => {
  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, INFINITE_SCROLL_CHANNEL);
  await waitForNewestMockMessage(page);

  const target = 150;

  await page.keyboard.press('ControlOrMeta+K');

  const searchInput = page.getByTestId(TestId.SEARCH_INPUT);

  await expect(searchInput).toBeVisible();
  await searchInput.fill(`Mock message ${target}`);

  const jumpButton = page.getByTestId(TestId.SEARCH_RESULT_JUMP).first();

  await expect(jumpButton).toBeVisible();
  await jumpButton.click();

  await expect
    .poll(async () => (await getMockMessageNumbers(page)).includes(target))
    .toBe(true);

  const windowNumbers = await getMockMessageNumbers(page);

  // a window around the target, not everything from the target to the present
  expect(Math.max(...windowNumbers)).toBeLessThan(NEWEST_MOCK_MESSAGE);
  expect(windowNumbers).toEqual([...windowNumbers].sort((a, b) => a - b));

  const returnToPresent = page.getByTestId(TestId.RETURN_TO_PRESENT);

  await expect(returnToPresent).toBeVisible();
  await returnToPresent.click();

  await expect(returnToPresent).toBeHidden();
  await waitForNewestMockMessage(page);
});

test('a second jump that reaches the present reattaches the channel', async ({
  page
}) => {
  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, INFINITE_SCROLL_CHANNEL);
  await waitForNewestMockMessage(page);

  const jumpTo = async (target: number) => {
    await page.keyboard.press('ControlOrMeta+K');

    const searchInput = page.getByTestId(TestId.SEARCH_INPUT);

    await expect(searchInput).toBeVisible();
    await searchInput.fill(`Mock message ${target}`);

    const jumpButton = page.getByTestId(TestId.SEARCH_RESULT_JUMP).first();

    await expect(jumpButton).toBeVisible();
    await jumpButton.click();

    await expect
      .poll(async () => (await getMockMessageNumbers(page)).includes(target))
      .toBe(true);
  };

  const returnToPresent = page.getByTestId(TestId.RETURN_TO_PRESENT);

  // far enough back that the window cannot reach the newest message
  await jumpTo(150);
  await expect(returnToPresent).toBeVisible();

  // within a page of the present, so this window does reach it. merging it into the detached
  // window above would splice two disjoint stretches of history together
  await jumpTo(950);
  await expect(returnToPresent).toBeHidden();

  const numbers = await getMockMessageNumbers(page);

  expect(Math.max(...numbers)).toBe(NEWEST_MOCK_MESSAGE);
  expect(Math.max(...numbers) - Math.min(...numbers) + 1).toBe(numbers.length);
});
