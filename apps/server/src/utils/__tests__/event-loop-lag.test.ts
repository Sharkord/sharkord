import { afterEach, describe, expect, test } from 'bun:test';
import {
  startEventLoopMonitor,
  stopEventLoopMonitor,
  takeEventLoopLag
} from '../event-loop-lag';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const blockFor = (ms: number) => {
  const end = performance.now() + ms;

  while (performance.now() < end) {
    // busy wait on purpose, this is the stall being measured
  }
};

describe('event loop lag', () => {
  afterEach(() => {
    stopEventLoopMonitor();
    takeEventLoopLag();
  });

  test('should report a stall of the event loop', async () => {
    startEventLoopMonitor();
    blockFor(800);

    // let the delayed probe fire
    await sleep(50);

    expect(takeEventLoopLag()).toBeGreaterThan(200);
  });

  test('should reset after the lag is taken', async () => {
    startEventLoopMonitor();
    blockFor(800);
    await sleep(50);
    takeEventLoopLag();

    expect(takeEventLoopLag()).toBe(0);
  });

  test('should report nothing when it was never started', () => {
    blockFor(50);

    expect(takeEventLoopLag()).toBe(0);
  });
});
