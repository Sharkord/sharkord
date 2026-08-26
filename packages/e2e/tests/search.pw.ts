import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';

// the mock channels hold 1300 messages between them, all of them "Mock message N", so a bare
// term caps out and a numbered one matches a handful. reads only, so this races with nothing
const CAPPED_QUERY = 'Mock message';
const NARROW_QUERY = 'Mock message 150';

// the server side is covered in messages.test.ts, condition by condition. what only a browser
// shows is the notice actually reaching the results list, which is the difference between a
// list that ends and a list the user knows was cut short
test('search says when it is only showing the most recent matches', async ({
  page
}) => {
  await loginAs(page, 'testowner', 'password123');

  await page.keyboard.press('ControlOrMeta+K');

  const input = page.getByTestId(TestId.SEARCH_INPUT);

  await expect(input).toBeVisible();

  await input.fill(CAPPED_QUERY);

  await expect(
    page.getByTestId(TestId.SEARCH_RESULT_JUMP).first()
  ).toBeVisible();
  await expect(page.getByTestId(TestId.SEARCH_TRUNCATED_NOTICE)).toBeVisible();

  await input.fill(NARROW_QUERY);

  await expect(
    page.getByTestId(TestId.SEARCH_RESULT_JUMP).first()
  ).toBeVisible();
  await expect(page.getByTestId(TestId.SEARCH_TRUNCATED_NOTICE)).toHaveCount(0);
});
