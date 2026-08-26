import { StreamKind } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { isOwnProducerEvent } from '../helpers';

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
