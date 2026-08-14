import { z } from 'zod';
import { ChannelPermission, type TFile, type TSettings, type TUser } from '.';
import type { WithOptional } from './type-utils';

export enum ChannelType {
  TEXT = 'TEXT',
  VOICE = 'VOICE'
}

export enum StreamKind {
  AUDIO = 'audio',
  VIDEO = 'video',
  SCREEN = 'screen',
  SCREEN_AUDIO = 'screen_audio',
  EXTERNAL_VIDEO = 'external_video',
  EXTERNAL_AUDIO = 'external_audio'
}

export type TExternalStreamTrackKind = 'audio' | 'video';

export type TExternalStreamTracks = {
  audio?: boolean;
  video?: boolean;
};

export type TStreamQualityLayer = {
  spatialLayer: number;
  label: string;
};

export type TStreamQuality =
  | { mode: 'auto' }
  | { mode: 'layer'; spatialLayer: number };

export type TRemoteProducerIds = {
  remoteVideoIds: number[];
  remoteAudioIds: number[];
  remoteScreenIds: number[];
  remoteScreenAudioIds: number[];
  remoteExternalStreamIds: number[];
};

export type TPublicServerSettings = Pick<
  TSettings,
  | 'name'
  | 'description'
  | 'serverId'
  | 'storageUploadEnabled'
  | 'directMessagesEnabled'
  | 'storageQuota'
  | 'storageUploadMaxFileSize'
  | 'storageFileSharingInDirectMessages'
  | 'storageMaxAvatarSize'
  | 'storageMaxBannerSize'
  | 'storageMaxFilesPerMessage'
  | 'storageSpaceQuotaByUser'
  | 'storageOverflowAction'
  | 'enablePlugins'
  | 'webRtcSimulcastEnabled'
  | 'enableSearch'
  | 'showWelcomeDialog'
  | 'storageSignedUrlsEnabled'
> & {
  webRtcMaxBitrate: number;
};

export type TMessageMediaMetadata = {
  kind: 'media';
  url: string;
  title?: string;
  description?: string;
  mediaType: 'image' | 'video' | 'audio';
};

export type TMessageOpenGraphMetadata = {
  kind: 'open_graph';
  url: string;
  title?: string;
  siteName?: string;
  description?: string;
  mediaType: string;
  images?: string[];
  videos?: string[];
  favicons?: string[];
};

export type TMessageMetadata =
  | TMessageMediaMetadata
  | TMessageOpenGraphMetadata;

export enum UserStatus {
  ONLINE = 'online',
  IDLE = 'idle',
  OFFLINE = 'offline'
}

export type TOwnUser = WithOptional<TUser, 'identity'>;

export type TConnectionParams = {
  token: string;
};

export type TTempFile = {
  id: string;
  originalName: string;
  size: number;
  md5: string;
  path: string;
  extension: string;
  userId: number;
};

export type TServerInfo = Pick<
  TSettings,
  'serverId' | 'name' | 'description' | 'allowNewUsers'
> & {
  logo: TFile | null;
  version?: string;
};

export type TWebAppManifest = {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
};

export type TArtifact = {
  name: string;
  target: string;
  size: number;
  checksum: string;
};

export type TVersionInfo = {
  version: string;
  releaseDate: string;
  artifacts: TArtifact[];
};

export type TIpInfo = {
  ip: string;
  hostname: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  org: string;
  postal: string;
  timezone: string;
};

export type TChannelPermissionsMap = Record<ChannelPermission, boolean>;

export type TChannelUserPermissionsMap = Record<
  number,
  { channelId: number; permissions: TChannelPermissionsMap }
>;

export type TReadStateMap = Record<number, number>;

export type TDirectMessageConversation = {
  channelId: number;
  userId: number;
  unreadCount: number;
  lastMessageAt: number;
};

// createdAt alone is not unique, two messages sent in the same millisecond
// would straddle a page boundary and the second would never be returned
export type TMessagesCursor = {
  createdAt: number;
  id: number;
};

export const zMessagesCursor = z.object({
  createdAt: z.number(),
  id: z.number()
});

export const DEFAULT_PROFILE_COLOR = '#262626';

export const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const INVITE_CODE_REGEX = /^[A-Za-z0-9_-]+$/;

// true for anything containing a pictographic character, which is how a unicode
// emoji is told apart from a custom emoji name without an exhaustive table
export const EMOJI_CHARACTER_REGEX = /\p{Extended_Pictographic}/u;

// standard emoji reactions are stored as the github shortcode the picker hands over ('fox'),
// not as the character, so the character test alone rejects every one of them
export const EMOJI_SHORTCODE_REGEX = /^[a-z0-9_+-]+$/;
