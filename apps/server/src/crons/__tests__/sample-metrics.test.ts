import { afterEach, describe, expect, test } from 'bun:test';
import type { WebSocket } from 'ws';
import { tdb } from '../../__tests__/setup';
import { settings } from '../../db/schema';
import { VoiceRuntime } from '../../runtimes/voice';
import { stopEventLoopMonitor } from '../../utils/event-loop-lag';
import {
  clearMetricsSamples,
  getMetricsSamples
} from '../../utils/metrics-samples';
import { clearUserSocketsForTests, trackUserSocket } from '../../utils/wss';
import { sampleMetrics } from '../sample-metrics';

const DAY_MS = 24 * 60 * 60_000;

describe('sample metrics cron', () => {
  afterEach(() => {
    clearMetricsSamples();
    clearUserSocketsForTests();
    stopEventLoopMonitor();
  });

  test('should record a sample once a baseline exists', async () => {
    await sampleMetrics();
    await sampleMetrics();

    const samples = getMetricsSamples(DAY_MS);
    const latest = samples[samples.length - 1]!;

    expect(samples.length).toBeGreaterThan(0);
    expect(latest.cpu).toBeGreaterThanOrEqual(0);
    expect(latest.cpu).toBeLessThanOrEqual(100);
    expect(latest.memory).toBeGreaterThan(0);
    expect(latest.systemMemoryUsed).toBeLessThanOrEqual(
      latest.systemMemoryTotal
    );
  });

  test('should count online users and users in voice', async () => {
    clearUserSocketsForTests();
    trackUserSocket(1, {} as WebSocket);
    trackUserSocket(1, {} as WebSocket);
    trackUserSocket(2, {} as WebSocket);

    // channel ids no seeded runtime uses
    const first = new VoiceRuntime(9500);
    const second = new VoiceRuntime(9501);

    first.addUser(1, { micMuted: false, soundMuted: false });
    first.addUser(2, { micMuted: false, soundMuted: false });
    second.addUser(3, { micMuted: false, soundMuted: false });

    // runtimes another test file left behind live in the same process
    let voiceUsersElsewhere = 0;

    for (const runtime of VoiceRuntime.getAll()) {
      if (runtime === first || runtime === second) continue;

      const { users } = runtime.getState();

      voiceUsersElsewhere += users.length;
    }

    await sampleMetrics();
    await sampleMetrics();

    await first.destroy();
    await second.destroy();

    const samples = getMetricsSamples(DAY_MS);
    const latest = samples[samples.length - 1]!;

    expect(latest.onlineUsers).toBe(2);
    expect(latest.voiceUsers).toBe(3 + voiceUsersElsewhere);
    expect(latest.eventLoopLag).toBeGreaterThanOrEqual(0);
  });

  test('should stop sampling but keep history when disabled', async () => {
    await sampleMetrics();
    await sampleMetrics();

    const before = getMetricsSamples(DAY_MS);

    await tdb.update(settings).set({ metricsEnabled: false });
    await sampleMetrics();
    await sampleMetrics();

    expect(before.length).toBeGreaterThan(0);
    expect(getMetricsSamples(DAY_MS)).toEqual(before);
  });

  test('should start from a fresh baseline after being enabled again', async () => {
    await tdb.update(settings).set({ metricsEnabled: false });
    await sampleMetrics();
    await tdb.update(settings).set({ metricsEnabled: true });
    await sampleMetrics();

    expect(getMetricsSamples(DAY_MS)).toEqual([]);
  });
});
