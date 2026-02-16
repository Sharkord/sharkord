import type { IceCandidate, IceParameters } from "mediasoup/types";
import type { TExternalStreamTracks } from "./types";

export type TVoiceUserState = {
  micMuted: boolean;
  soundMuted: boolean;
  webcamEnabled: boolean;
  sharingScreen: boolean;
};

export type TVoiceUser = {
  userId: number;
  state: TVoiceUserState;
};

export type TExternalStream = {
  title: string;
  key: string;
  pluginId: string;
  avatarUrl?: string;
  tracks: TExternalStreamTracks;
};

export type TChannelState = {
  users: TVoiceUser[];
  externalStreams: { [streamId: number]: TExternalStream };
  activeSince: string | null;
};

export type TTransportParams = {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: any;
};

export type TPublicVoiceChannelState = {
  users: {
    [userId: number]: TVoiceUserState;
  };
  activeSince: string | null;
};

export type TVoiceMap = {
  [channelId: number]: TPublicVoiceChannelState;
};

export type TExternalStreamsMap = {
  [channelId: number]: {
    [streamId: number]: TExternalStream;
  };
};
