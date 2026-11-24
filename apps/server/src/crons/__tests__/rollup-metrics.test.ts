import type { TMetricsSample } from '@sharkord/shared';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { tdb } from '../../__tests__/setup';
import { insertMetricsSample } from '../../db/mutations/metrics';
import { metricsSamples } from '../../db/schema';
import {
  addMetricsSample,
  clearMetricsSamples,
  METRICS_RETENTION_MS
} from '../../utils/metrics-samples';
import { rollupMetrics } from '../rollup-metrics';

const sample = (timestamp: number, cpu: number): TMetricsSample => ({
  timestamp,
  cpu,
  memory: cpu * 10,
  systemCpu: cpu,
  systemMemoryUsed: cpu,
  systemMemoryTotal: 100,
  workerCpu: null,
  workerMemory: null,
  voiceRx: cpu,
  voiceTx: null,
  onlineUsers: cpu,
  voiceUsers: 0,
  voiceProducers: 0,
  voiceConsumers: 0,
  eventLoopLag: 0
});

describe('rollup metrics cron', () => {
  beforeEach(() => {
    clearMetricsSamples();
  });

  afterEach(() => {
    clearMetricsSamples();
  });

  test('should store the average of the last minute', async () => {
    const now = Date.now();

    addMetricsSample(sample(now - 2 * 60_000, 90));
    addMetricsSample(sample(now - 1000, 10));
    addMetricsSample(sample(now, 30));

    await rollupMetrics();

    const rows = await tdb.select().from(metricsSamples);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.cpu).toBe(20);
    expect(rows[0]!.timestamp % 60_000).toBe(0);
  });

  test('should store nothing when nothing was sampled', async () => {
    await rollupMetrics();

    const rows = await tdb.select().from(metricsSamples);

    expect(rows).toEqual([]);
  });

  test('should delete samples past the retention', async () => {
    const now = Date.now();
    const kept = sample(now - 60_000, 20);

    await insertMetricsSample(sample(now - METRICS_RETENTION_MS - 1, 10));
    await insertMetricsSample(kept);

    await rollupMetrics();

    const rows = await tdb.select().from(metricsSamples);

    expect(rows).toEqual([kept]);
  });
});
