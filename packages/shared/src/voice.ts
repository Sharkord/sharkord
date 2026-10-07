import type { IceCandidate, IceParameters } from 'mediasoup/types';
import type { StreamKind, TExternalStreamTracks } from './types';

export type { ConsumerType } from 'mediasoup/types';

export type TVoiceUserState = {
  micMuted: boolean;
  soundMuted: boolean;
  webcamEnabled: boolean;
  sharingScreen: boolean;
  supportsDirectScreenShare?: boolean;
};

export type TPeerToPeerIceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type TDirectScreenShareSignal = {
  channelId: number;
  senderId: number;
  sharerId: number;
} & (
  | {
      type: 'offer';
      description: { type: 'offer'; sdp: string };
    }
  | {
      type: 'answer';
      description: { type: 'answer'; sdp: string };
    }
  | {
      type: 'candidate';
      candidate: {
        candidate: string;
        sdpMid?: string | null;
        sdpMLineIndex?: number | null;
        usernameFragment?: string | null;
      };
    }
  | {
      type: 'stop';
      reason?: 'stopped' | 'channel-not-1:1' | 'peer-left';
    }
);

export type TVoiceUser = {
  userId: number;
  state: TVoiceUserState;
};

export type TExternalStream = {
  title: string;
  key: string;
  pluginId: string;
  avatarUrl?: string;
  bannerUrl?: string;
  tracks: TExternalStreamTracks;
};

export type TChannelState = {
  users: TVoiceUser[];
  externalStreams: { [streamId: number]: TExternalStream };
};

export type TTransportParams = {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: any;
};

export type TVoiceMap = {
  [channelId: number]: {
    users: {
      [userId: number]: TVoiceUserState;
    };
  };
};

export type TExternalStreamsMap = {
  [channelId: number]: {
    [streamId: number]: TExternalStream;
  };
};

export type TVoiceProducerInfo = {
  userId: number;
  kind: StreamKind;
  producerId: string;
  paused: boolean;
};
