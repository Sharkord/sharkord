import { describe, expect, test } from 'bun:test';
import { applyAudioOutputDevice } from '../audio-output';

const createAudioElement = (sinkId: string, fail = false) => {
  const calls: string[] = [];

  const element = {
    sinkId,
    setSinkId: async (deviceId: string) => {
      calls.push(deviceId);

      if (fail) throw new Error('NotFoundError');

      element.sinkId = deviceId;
    }
  };

  return { element: element as unknown as HTMLAudioElement, calls };
};

describe('applyAudioOutputDevice', () => {
  test('does not touch an element already on the system default for the default device', async () => {
    const { element, calls } = createAudioElement('');

    const result = await applyAudioOutputDevice(element, 'default');

    expect(result).toBe(true);
    expect(calls).toEqual([]);
  });

  test('switches back to the system default output for the default device', async () => {
    const { element, calls } = createAudioElement('speaker-1');

    const result = await applyAudioOutputDevice(element, 'default');

    expect(result).toBe(true);
    expect(calls).toEqual(['']);
  });

  test('switches to a specific device', async () => {
    const { element, calls } = createAudioElement('');

    const result = await applyAudioOutputDevice(element, 'speaker-1');

    expect(result).toBe(true);
    expect(calls).toEqual(['speaker-1']);
  });

  test('reports failure when the browser rejects the device', async () => {
    const { element } = createAudioElement('', true);

    const result = await applyAudioOutputDevice(element, 'missing', false);

    expect(result).toBe(false);
  });
});
