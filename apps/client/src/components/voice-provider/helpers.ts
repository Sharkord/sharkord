import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { VideoCodec, type TStreamQuality } from '@/types';
import { StreamKind, type ConsumerType } from '@sharkord/shared';
import type {
  RtpCapabilities,
  RtpCodecCapability
} from 'mediasoup-client/types';

type TStreamQualitySettings = Record<string, TStreamQuality>;
type TRemoteConsumerTypes = Record<string, ConsumerType | undefined>;

const loadStreamQualitiesFromStorage = (): TStreamQualitySettings => {
  try {
    return (
      getLocalStorageItemAsJSON<TStreamQualitySettings>(
        LocalStorageKey.STREAM_QUALITY_SETTINGS
      ) ?? {}
    );
  } catch {
    return {};
  }
};

const saveStreamQualitiesToStorage = (qualities: TStreamQualitySettings) => {
  try {
    setLocalStorageItemAsJSON(
      LocalStorageKey.STREAM_QUALITY_SETTINGS,
      qualities
    );
  } catch {
    // ignore
  }
};

const getStreamQualityStorageKey = (remoteId: number, kind: StreamKind) => {
  switch (kind) {
    case StreamKind.EXTERNAL_VIDEO:
      return `external-video-${remoteId}`;
    case StreamKind.SCREEN:
      return `user-screen-${remoteId}`;
    case StreamKind.VIDEO:
      return `user-video-${remoteId}`;
    default:
      return `${remoteId}-${kind}`;
  }
};

const getRemoteConsumerTypeKey = (remoteId: number, kind: StreamKind) => {
  return `${remoteId}-${kind}`;
};

const getSimulcastEncodings = (
  maxBitrate: number
): RTCRtpEncodingParameters[] => {
  const safeMaxBitrate = Math.max(100_000, maxBitrate);

  return [
    {
      maxBitrate: Math.min(150_000, Math.round(safeMaxBitrate * 0.35)),
      scaleResolutionDownBy: 4
    },
    {
      maxBitrate: Math.min(500_000, Math.round(safeMaxBitrate * 0.65)),
      scaleResolutionDownBy: 2
    },
    {
      maxBitrate: safeMaxBitrate,
      scaleResolutionDownBy: 1
    }
  ];
};

const getSimulcastCodec = (
  rtpCapabilities: RtpCapabilities | null
): RtpCodecCapability | undefined =>
  rtpCapabilities?.codecs?.find(
    (c) => c.mimeType.toLowerCase() === VideoCodec.VP8.toLowerCase()
  );

export {
  getRemoteConsumerTypeKey,
  getSimulcastCodec,
  getSimulcastEncodings,
  getStreamQualityStorageKey,
  loadStreamQualitiesFromStorage,
  saveStreamQualitiesToStorage
};

export type { TRemoteConsumerTypes, TStreamQualitySettings };
