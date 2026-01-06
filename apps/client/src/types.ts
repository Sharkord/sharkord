import type { StreamKind } from '@sharkord/shared';

export type TDevices = {
  input: {
    deviceId: string | undefined;
    autoGainControl: boolean;
    echoCancellation: boolean;
    noiseSuppression: boolean;
  };
  playback: {
    deviceId: string | undefined;
  };
  webcam: {
    deviceId: string | undefined;
    resolution: Resolution;
    framerate: number;
  };
  screen: {
    resolution: Resolution;
    framerate: number;
    audio: boolean;
  };
};

export enum Resolution {
  '2160p' = '2160p',
  '1440p' = '1440p',
  '1080p' = '1080p',
  '720p' = '720p',
  '480p' = '480p',
  '360p' = '360p',
  '240p' = '240p',
  '144p' = '144p'
}

export type TDeviceSettings = {
  microphoneId: string | undefined;
  webcamId: string | undefined;
  webcamResolution: Resolution;
  webcamFramerate: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  shareSystemAudio: boolean;
  screenResolution: Resolution;
  screenFramerate: number;
};

export type TRemoteStreams = {
  [userId: number]: {
    [StreamKind.AUDIO]: MediaStream | undefined;
    [StreamKind.VIDEO]: MediaStream | undefined;
    [StreamKind.SCREEN]: MediaStream | undefined;
  };
};
