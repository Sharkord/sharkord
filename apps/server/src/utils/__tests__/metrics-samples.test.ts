import type { TMetricsSample } from '@sharkord/shared';
import { afterEach, describe, expect, test } from 'bun:test';
import {
  addMetricsSample,
  clearMetricsSamples,
  downsampleSamples,
  getMetricsSamples,
  getRecentMetricsAverage,
  METRICS_MAX_SAMPLES
} from '../metrics-samples';

const DAY_MS = 24 * 60 * 60_000;

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

describe('metrics samples', () => {
  afterEach(() => {
    clearMetricsSamples();
  });

  test('should drop the oldest samples past the limit', () => {
    const now = Date.now();

    for (let i = 0; i <= METRICS_MAX_SAMPLES; i++) {
      addMetricsSample(sample(now - METRICS_MAX_SAMPLES + i, i));
    }

    const samples = getMetricsSamples(DAY_MS);

    expect(samples.length).toBeLessThanOrEqual(METRICS_MAX_SAMPLES);
    expect(samples[0]!.cpu).toBeGreaterThan(0);
  });

  test('should only return samples inside the range', () => {
    const now = Date.now();

    addMetricsSample(sample(now - 2 * 60_000, 10));
    addMetricsSample(sample(now, 20));

    const samples = getMetricsSamples(60_000);

    expect(samples).toEqual([sample(now, 20)]);
  });

  test('should average only the samples inside the window', () => {
    const now = Date.now();

    addMetricsSample(sample(now - 2 * 60_000, 90));
    addMetricsSample(sample(now - 1000, 10, 4));
    addMetricsSample(sample(now, 30));

    const average = getRecentMetricsAverage(60_000);

    expect(average).toEqual({ ...sample(now, 20), workerCpu: 4 });
  });

  test('should return no average when nothing was sampled in the window', () => {
    addMetricsSample(sample(Date.now() - 2 * 60_000, 90));

    expect(getRecentMetricsAverage(60_000)).toBeNull();
  });

  test('should clear every sample', () => {
    addMetricsSample(sample(Date.now(), 10));
    clearMetricsSamples();

    expect(getMetricsSamples(DAY_MS)).toEqual([]);
  });

  test('should leave samples untouched when under the point limit', () => {
    const input = [sample(1, 10), sample(2, 20)];

    expect(downsampleSamples(input, 5)).toBe(input);
  });

  test('should average buckets and keep the last timestamp', () => {
    const input = [sample(1, 10), sample(2, 30), sample(3, 50), sample(4, 70)];

    expect(downsampleSamples(input, 2)).toEqual([sample(2, 20), sample(4, 60)]);
  });

  test('should keep the worst event loop lag of a bucket', () => {
    const input = [
      { ...sample(1, 10), eventLoopLag: 5 },
      { ...sample(2, 10), eventLoopLag: 250 },
      { ...sample(3, 10), eventLoopLag: 20 }
    ];
    const [downsampled] = downsampleSamples(input, 1);

    expect(downsampled!.eventLoopLag).toBe(250);
  });

  test('should ignore missing worker values when averaging', () => {
    const input = [sample(1, 10, null), sample(2, 10, 40)];
    const [averaged] = downsampleSamples(input, 1);

    expect(averaged!.workerCpu).toBe(40);
  });

  test('should keep a bucket without worker values empty', () => {
    const input = [sample(1, 10), sample(2, 10)];
    const [averaged] = downsampleSamples(input, 1);

    expect(averaged!.workerCpu).toBeNull();
  });
});
