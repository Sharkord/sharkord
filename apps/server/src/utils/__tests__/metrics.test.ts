import { describe, expect, test } from 'bun:test';
import path from 'path';
import { DATA_PATH } from '../../helpers/paths';
import { getDiskMetrics } from '../metrics';

describe('getDiskMetrics', () => {
  test('should use only the filesystem containing DATA_PATH', async () => {
    const normalizedDataPath = path.resolve(DATA_PATH);
    const dataMount = path.dirname(normalizedDataPath);

    const mockedFsSize = [
      { mount: '/', size: 1_000, used: 300 },
      { mount: dataMount, size: 500, used: 120 },
      { mount: '/mnt/other', size: 10_000, used: 9_000 }
    ];

    const result = await getDiskMetrics({
      fsSize: async () => mockedFsSize,
      getUsedFileQuota: async () => 42,
      dataPath: normalizedDataPath
    });

    expect(result.totalSpace).toBe(500);
    expect(result.usedSpace).toBe(120);
    expect(result.freeSpace).toBe(380);
    expect(result.sharkordUsedSpace).toBe(42);
  });

  test('should fallback to the first filesystem when no mount matches DATA_PATH', async () => {
    const mockedFsSize = [
      { mount: '/unrelated-a', size: 700, used: 100 },
      { mount: '/unrelated-b', size: 900, used: 450 }
    ];

    const result = await getDiskMetrics({
      fsSize: async () => mockedFsSize,
      getUsedFileQuota: async () => 0,
      dataPath: '/definitely-not-matching'
    });

    expect(result.totalSpace).toBe(700);
    expect(result.usedSpace).toBe(100);
    expect(result.freeSpace).toBe(600);
  });
});
