import type { TMetricsSample } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { tdb } from '../../__tests__/setup';
import {
  deleteMetricsSamplesBefore,
  insertMetricsSample
} from '../mutations/metrics';
import { getStoredMetricsSamples } from '../queries/metrics';
import { metricsSamples } from '../schema';

const sample = (
  timestamp: number,
  cpu: number,
  workerCpu: number | null = null
): TMetricsSample => ({
  timestamp,
  cpu,
  memory: cpu * 10,
  systemCpu: cpu,
  systemMemoryUsed: cpu,
  systemMemoryTotal: 100,
  workerCpu,
  workerMemory: null,
  voiceRx: cpu,
  voiceTx: null,
  onlineUsers: cpu,
  voiceUsers: 0,
  voiceProducers: 0,
  voiceConsumers: 0,
  eventLoopLag: 0
});

describe('stored metrics samples', () => {
  test('should average each bucket and keep its last timestamp', async () => {
    await insertMetricsSample(sample(100, 10, 2));
    await insertMetricsSample(sample(900, 30));
    await insertMetricsSample(sample(1500, 50));

    const samples = await getStoredMetricsSamples(0, 1000);

    expect(samples).toEqual([
      { ...sample(900, 20), workerCpu: 2 },
      sample(1500, 50)
    ]);
  });

  test('should keep the worst event loop lag of a bucket', async () => {
    await insertMetricsSample({ ...sample(100, 10), eventLoopLag: 5 });
    await insertMetricsSample({ ...sample(200, 10), eventLoopLag: 250 });

    const [stored] = await getStoredMetricsSamples(0, 1000);

    expect(stored!.eventLoopLag).toBe(250);
  });

  test('should leave out samples older than the range', async () => {
    await insertMetricsSample(sample(100, 10));
    await insertMetricsSample(sample(1500, 50));

    const samples = await getStoredMetricsSamples(1000, 1000);

    expect(samples).toEqual([sample(1500, 50)]);
  });

  test('should keep the first sample stored for a timestamp', async () => {
    await insertMetricsSample(sample(100, 10));
    await insertMetricsSample(sample(100, 90));

    const rows = await tdb.select().from(metricsSamples);

    expect(rows).toEqual([sample(100, 10)]);
  });

  test('should delete only samples before the cutoff', async () => {
    await insertMetricsSample(sample(100, 10));
    await insertMetricsSample(sample(1500, 50));

    await deleteMetricsSamplesBefore(1000);

    const rows = await tdb.select().from(metricsSamples);

    expect(rows).toEqual([sample(1500, 50)]);
  });
});
