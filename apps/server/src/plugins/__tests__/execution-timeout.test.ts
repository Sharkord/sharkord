import { describe, expect, test } from 'bun:test';
import { withTimeout } from '../execution-timeout';

describe('execution-timeout', () => {
  describe('withTimeout', () => {
    test('should resolve with the task value when task completes before timeout', async () => {
      const result = await withTimeout(
        Promise.resolve('hello'),
        1000,
        'Timed out'
      );

      expect(result).toBe('hello');
    });

    test('should return the correct type', async () => {
      const result = await withTimeout(
        Promise.resolve({ id: 1, name: 'test' }),
        1000,
        'Timed out'
      );

      expect(result).toEqual({ id: 1, name: 'test' });
    });

    test('should throw with the timeout message when task exceeds timeout', async () => {
      const slowTask = new Promise<string>((resolve) => {
        setTimeout(() => resolve('done'), 200);
      });

      await expect(
        withTimeout(slowTask, 50, 'Custom timeout message')
      ).rejects.toThrow('Custom timeout message');
    });

    test('should forward the task rejection when task rejects before timeout', async () => {
      const failingTask = Promise.reject(new Error('Task failed'));

      await expect(withTimeout(failingTask, 1000, 'Timed out')).rejects.toThrow(
        'Task failed'
      );
    });

    test('should handle task that rejects with a non-error value', async () => {
      const failingTask = Promise.reject('string rejection');

      await expect(withTimeout(failingTask, 1000, 'Timed out')).rejects.toBe(
        'string rejection'
      );
    });

    test('should resolve immediately resolving promises', async () => {
      const result = await withTimeout(Promise.resolve(42), 50, 'Timed out');

      expect(result).toBe(42);
    });
  });
});
