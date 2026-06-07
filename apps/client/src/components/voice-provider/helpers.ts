import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { VideoCodec, type TStreamQuality } from '@/types';
import {
  StreamKind,
  type ConsumerType,
  type TStreamQualityLayer
} from '@sharkord/shared';
import type {
  RtpCapabilities,
  RtpCodecCapability
} from 'mediasoup-client/types';
import {
  SIMULCAST_HIGH_LAYER_SCALE,
  SIMULCAST_LOW_LAYER_BITRATE_RATIO,
  SIMULCAST_LOW_LAYER_MAX_BITRATE,
  SIMULCAST_LOW_LAYER_MAX_FRAMERATE,
  SIMULCAST_LOW_LAYER_SCALE,
  SIMULCAST_MID_LAYER_BITRATE_RATIO,
  SIMULCAST_MID_LAYER_MAX_BITRATE,
  SIMULCAST_MID_LAYER_MAX_FRAMERATE,
  SIMULCAST_MID_LAYER_SCALE,
  SIMULCAST_MIN_MAX_BITRATE
} from './statics';

type TStreamQualitySettings = Record<string, TStreamQuality>;
type TRemoteConsumerTypes = Record<string, ConsumerType | undefined>;
type TRemoteQualityLayers = Record<string, TStreamQualityLayer[] | undefined>;

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

const normalizeStreamQuality = (
  quality: TStreamQuality | undefined,
  layers: TStreamQualityLayer[]
): TStreamQuality => {
  if (!quality) return { mode: 'auto' };

  if (
    quality.mode === 'layer' &&
    layers.length > 0 &&
    !layers.some((layer) => layer.spatialLayer === quality.spatialLayer)
  ) {
    return { mode: 'auto' };
  }

  return quality;
};

const getStreamQualityDropdownValue = (quality: TStreamQuality) => {
  return quality.mode === 'auto' ? 'auto' : `layer-${quality.spatialLayer}`;
};

const parseStreamQualityDropdownValue = (value: string): TStreamQuality => {
  if (value === 'auto') return { mode: 'auto' };

  return {
    mode: 'layer',
    spatialLayer: Number(value.replace('layer-', ''))
  };
};

const getSimulcastEncodings = (
  maxBitrate: number
): RTCRtpEncodingParameters[] => {
  const safeMaxBitrate = Math.max(SIMULCAST_MIN_MAX_BITRATE, maxBitrate);

  return [
    {
      maxBitrate: Math.min(
        SIMULCAST_LOW_LAYER_MAX_BITRATE,
        Math.round(safeMaxBitrate * SIMULCAST_LOW_LAYER_BITRATE_RATIO)
      ),
      maxFramerate: SIMULCAST_LOW_LAYER_MAX_FRAMERATE,
      scaleResolutionDownBy: SIMULCAST_LOW_LAYER_SCALE
    },
    {
      maxBitrate: Math.min(
        SIMULCAST_MID_LAYER_MAX_BITRATE,
        Math.round(safeMaxBitrate * SIMULCAST_MID_LAYER_BITRATE_RATIO)
      ),
      maxFramerate: SIMULCAST_MID_LAYER_MAX_FRAMERATE,
      scaleResolutionDownBy: SIMULCAST_MID_LAYER_SCALE
    },
    {
      maxBitrate: safeMaxBitrate,
      scaleResolutionDownBy: SIMULCAST_HIGH_LAYER_SCALE
    }
  ];
};

const getSimulcastQualityLayers = (
  track: MediaStreamTrack,
  encodings: RTCRtpEncodingParameters[]
): TStreamQualityLayer[] => {
  const settings = track.getSettings();
  const sourceHeight = settings.height;

  if (!sourceHeight) {
    throw new Error('Unable to determine video height for simulcast labels');
  }

  return encodings.map((encoding, index) => {
    const scale = encoding.scaleResolutionDownBy ?? 1;
    const height = Math.max(1, Math.round(sourceHeight / scale));

    return {
      spatialLayer: index,
      label: `${height}p`
    };
  });
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
  getSimulcastQualityLayers,
  getStreamQualityDropdownValue,
  getStreamQualityStorageKey,
  loadStreamQualitiesFromStorage,
  normalizeStreamQuality,
  parseStreamQualityDropdownValue,
  saveStreamQualitiesToStorage
};

export type {
  TRemoteConsumerTypes,
  TRemoteQualityLayers,
  TStreamQualitySettings
};
