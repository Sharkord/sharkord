import type { TExternalStreamsMap } from '@sharkord/shared';
import { StreamKind } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import {
  getOwnedExternalVolumeKeys,
  isOwnProducerEvent,
  resolveVolume
} from '../helpers';

describe('isOwnProducerEvent', () => {
  test('should treat a producer with our own user id as ours', () => {
    expect(isOwnProducerEvent(1, 1, StreamKind.AUDIO)).toBe(true);
    expect(isOwnProducerEvent(1, 1, StreamKind.VIDEO)).toBe(true);
    expect(isOwnProducerEvent(1, 1, StreamKind.SCREEN)).toBe(true);
    expect(isOwnProducerEvent(1, 1, StreamKind.SCREEN_AUDIO)).toBe(true);
  });

  test('should treat another user as not ours', () => {
    expect(isOwnProducerEvent(2, 1, StreamKind.AUDIO)).toBe(false);
  });

  // the runtime hands out external stream ids from a counter starting at zero, so the
  // second stream in a channel is id 1, which is also the first user id. treating that as
  // our own producer drops the plugin's audio for exactly one unlucky listener
  test('should never treat an external stream as ours, even on an id collision', () => {
    expect(isOwnProducerEvent(1, 1, StreamKind.EXTERNAL_AUDIO)).toBe(false);
    expect(isOwnProducerEvent(1, 1, StreamKind.EXTERNAL_VIDEO)).toBe(false);
    expect(isOwnProducerEvent(0, 0, StreamKind.EXTERNAL_AUDIO)).toBe(false);
  });

  test('should treat nothing as ours before the own user id is known', () => {
    expect(isOwnProducerEvent(1, undefined, StreamKind.AUDIO)).toBe(false);
  });
});

const stream = (key: string, ownerUserId?: number) => ({
  title: key,
  key,
  pluginId: 'obs',
  ownerUserId,
  tracks: { audio: true, video: true }
});

const STREAMS: TExternalStreamsMap = {
  10: { 0: stream('mine', 1), 1: stream('theirs', 2), 2: stream('nobody') }
};

describe('external stream default volume', () => {
  test('should start the owner of a stream muted', () => {
    const owned = getOwnedExternalVolumeKeys(STREAMS, 1);

    expect(resolveVolume({}, 'external-obs-mine', owned)).toBe(0);
  });

  test('should play everyone else at full volume', () => {
    const owned = getOwnedExternalVolumeKeys(STREAMS, 1);

    expect(resolveVolume({}, 'external-obs-theirs', owned)).toBe(100);
    expect(resolveVolume({}, 'external-obs-nobody', owned)).toBe(100);
    expect(resolveVolume({}, 'user-2', owned)).toBe(100);
  });

  test('should let a volume the owner picked win over the muted default', () => {
    const owned = getOwnedExternalVolumeKeys(STREAMS, 1);

    expect(
      resolveVolume({ 'external-obs-mine': 40 }, 'external-obs-mine', owned)
    ).toBe(40);
  });

  test('should own nothing before the own user id is known', () => {
    expect(getOwnedExternalVolumeKeys(STREAMS, undefined).size).toBe(0);
  });
});
