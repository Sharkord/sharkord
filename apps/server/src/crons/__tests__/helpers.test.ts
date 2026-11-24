import { describe, expect, test } from 'bun:test';
import { readResidentMemory } from '../helpers';

describe('cron helpers', () => {
  test.skipIf(process.platform !== 'linux')(
    'reads the current resident memory of a process',
    async () => {
      const memory = await readResidentMemory(process.pid);
      const { rss } = process.memoryUsage();

      expect(memory).toBeGreaterThan(0);
      expect(memory!).toBeLessThan(rss * 2);
      expect(memory!).toBeGreaterThan(rss / 2);
    }
  );

  test('returns null for a process that does not exist', async () => {
    expect(await readResidentMemory(2 ** 30)).toBeNull();
  });
});
