import { ChannelPermission, type TFile, type TSettings, type TUser } from ".";

export enum ChannelType {
  TEXT = "TEXT",
  VOICE = "VOICE",
}

export enum StreamKind {
  AUDIO = "audio",
  VIDEO = "video",
  SCREEN = "screen",
  SCREEN_AUDIO = "screen_audio",
  EXTERNAL_VIDEO = "external_video",
  EXTERNAL_AUDIO = "external_audio"
}

export type TExternalStreamTrackKind = "audio" | "video";

export type TExternalStreamTracks = {
  audio?: boolean;
  video?: boolean;
};

export type TRemoteProducerIds = {
  remoteVideoIds: number[];
  remoteAudioIds: number[];
  remoteScreenIds: number[];
  remoteScreenAudioIds: number[];
  remoteExternalStreamIds: number[];
};

export type TPublicServerSettings = Pick<
  TSettings,
  | "name"
  | "description"
  | "serverId"
  | "storageUploadEnabled"
  | "storageQuota"
  | "storageUploadMaxFileSize"
  | "storageSpaceQuotaByUser"
  | "storageOverflowAction"
  | "enablePlugins"
>;

export type TGenericObject = {
  [key: string]: any;
};

export type TGenericFunction = {
  (...args: any[]): any;
};

export type TMessageMetadata = {
  url: string;
  title?: string;
  siteName?: string;
  description?: string;
  mediaType: string;
  images?: string[];
  videos?: string[];
  favicons?: string[];
};

export type WithOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

export enum UserStatus {
  ONLINE = "online",
  IDLE = "idle",
  OFFLINE = "offline",
}

export type TOwnUser = WithOptional<TUser, "identity">;

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
  "serverId" | "name" | "description" | "allowNewUsers"
> & {
  logo: TFile | null;
  version: string;
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
