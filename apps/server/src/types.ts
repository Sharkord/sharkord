import type { ServerEvents } from '@sharkord/shared';

export type TTokenPayload = {
  userId: number;
  exp: number;
  tokenVersion?: number;
};

export type TConnectionInfo = {
  ip?: string;
  os?: string;
  device?: string;
  browser?: string;
  desktopVersion?: string;
  userAgent?: string;
};

export type TVoicePresenceTopic =
  | ServerEvents.USER_JOIN_VOICE
  | ServerEvents.USER_LEAVE_VOICE
  | ServerEvents.USER_VOICE_STATE_UPDATE
  | ServerEvents.USER_VOICE_REACTION
  | ServerEvents.VOICE_ADD_EXTERNAL_STREAM
  | ServerEvents.VOICE_UPDATE_EXTERNAL_STREAM
  | ServerEvents.VOICE_REMOVE_EXTERNAL_STREAM;
