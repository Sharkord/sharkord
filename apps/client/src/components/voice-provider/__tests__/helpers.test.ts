import { VideoCodec } from '@/types';
import type { TExternalStreamsMap } from '@sharkord/shared';
import { StreamKind } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import type {
  RtpCapabilities,
  RtpCodecCapability
} from 'mediasoup-client/types';
import {
  getOwnedExternalVolumeKeys,
  getPreferredScreenCodec,
  getUserScreenVolumeKey,
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

describe('screen share audio default volume', () => {
  const screenKey = getUserScreenVolumeKey(2);

  test('should play screen share audio at full volume by default', () => {
    expect(resolveVolume({}, screenKey, new Set())).toBe(100);
  });

  test('should start screen share audio muted when the setting is on', () => {
    expect(resolveVolume({}, screenKey, new Set(), true)).toBe(0);
  });

  test('should only mute screen share audio, never voices or external streams', () => {
    expect(resolveVolume({}, 'user-2', new Set(), true)).toBe(100);
    expect(resolveVolume({}, 'external-obs-theirs', new Set(), true)).toBe(100);
  });

  test('should let a volume the user picked win over the muted default', () => {
    expect(resolveVolume({ [screenKey]: 60 }, screenKey, new Set(), true)).toBe(
      60
    );
  });
});

const videoCodec = (
  mimeType: string,
  parameters: RtpCodecCapability['parameters'] = {}
): RtpCodecCapability => ({
  kind: 'video',
  mimeType,
  preferredPayloadType: 96,
  clockRate: 90000,
  parameters
});

const vp9 = videoCodec('video/VP9');
const h264ConstrainedBaseline = videoCodec('video/H264', {
  'profile-level-id': '42e01f'
});
const h264High = videoCodec('video/H264', { 'profile-level-id': '640032' });
const h264Main = videoCodec('video/H264', { 'profile-level-id': '4d0032' });

const chromiumCapabilities: RtpCapabilities = {
  codecs: [vp9, h264ConstrainedBaseline, h264High, h264Main]
};
const firefoxCapabilities: RtpCapabilities = {
  codecs: [vp9, h264ConstrainedBaseline]
};

describe('getPreferredScreenCodec', () => {
  test('should leave the choice to mediasoup on auto', () => {
    expect(
      getPreferredScreenCodec(chromiumCapabilities, VideoCodec.AUTO)
    ).toBeUndefined();
  });

  test('should keep plain h264 on constrained baseline so firefox can watch', () => {
    expect(getPreferredScreenCodec(chromiumCapabilities, VideoCodec.H264)).toBe(
      h264ConstrainedBaseline
    );
  });

  test('should pick high for h264 high when the device can send it', () => {
    expect(
      getPreferredScreenCodec(chromiumCapabilities, VideoCodec.H264_HIGH)
    ).toBe(h264High);
  });

  test('should pick main for h264 high when high is not available', () => {
    expect(
      getPreferredScreenCodec(
        { codecs: [h264ConstrainedBaseline, h264Main] },
        VideoCodec.H264_HIGH
      )
    ).toBe(h264Main);
  });

  test('should fall back to constrained baseline for h264 high on firefox', () => {
    expect(
      getPreferredScreenCodec(firefoxCapabilities, VideoCodec.H264_HIGH)
    ).toBe(h264ConstrainedBaseline);
  });

  test('should return nothing for a codec the device cannot send', () => {
    expect(
      getPreferredScreenCodec(firefoxCapabilities, VideoCodec.AV1)
    ).toBeUndefined();
  });

  test('should return nothing before the device is loaded', () => {
    expect(getPreferredScreenCodec(null, VideoCodec.VP9)).toBeUndefined();
  });
});
