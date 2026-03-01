import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  activityLog,
  categories,
  channelReadStates,
  channelRolePermissions,
  channels,
  channelUserPermissions,
  directMessages,
  emojis,
  files,
  invites,
  logins,
  messageFiles,
  messageReactions,
  messages,
  rolePermissions,
  roles,
  settings,
  userRoles,
  users
} from '../../../apps/server/src/db/schema';
import type { Permission } from './statics';
import type { UserStatus } from './types';

export type TSettings = InferSelectModel<typeof settings>;
export type TRole = InferSelectModel<typeof roles>;
export type TCategory = InferSelectModel<typeof categories>;
export type TChannel = InferSelectModel<typeof channels>;
export type TFile = InferSelectModel<typeof files> & {
  _accessToken?: string;
};
export type TUser = InferSelectModel<typeof users>;
export type TLogin = InferSelectModel<typeof logins>;
export type TMessage = InferSelectModel<typeof messages>;
export type TMessageFile = InferSelectModel<typeof messageFiles>;
export type TRolePermission = InferSelectModel<typeof rolePermissions>;
export type TEmoji = InferSelectModel<typeof emojis>;
export type TMessageReaction = InferSelectModel<typeof messageReactions>;
export type TInvite = InferSelectModel<typeof invites>;
export type TActivityLog = InferSelectModel<typeof activityLog>;
export type TUserRole = InferSelectModel<typeof userRoles>;
export type TChannelRolePermission = InferSelectModel<
  typeof channelRolePermissions
>;
export type TChannelUserPermission = InferSelectModel<
  typeof channelUserPermissions
>;
export type TChannelReadState = InferSelectModel<typeof channelReadStates>;
export type TDirectMessage = InferSelectModel<typeof directMessages>;

export type TISettings = InferInsertModel<typeof settings>;
export type TIRole = InferInsertModel<typeof roles>;
export type TICategory = InferInsertModel<typeof categories>;
export type TIChannel = InferInsertModel<typeof channels>;
export type TIFile = InferInsertModel<typeof files>;
export type TIUser = InferInsertModel<typeof users>;
export type TILogin = InferInsertModel<typeof logins>;
export type TIMessage = InferInsertModel<typeof messages>;
export type TIMessageFile = InferInsertModel<typeof messageFiles>;
export type TIRolePermission = InferInsertModel<typeof rolePermissions>;
export type TIEmoji = InferInsertModel<typeof emojis>;
export type TIMessageReaction = InferInsertModel<typeof messageReactions>;
export type TIInvite = InferInsertModel<typeof invites>;
export type TIActivityLog = InferInsertModel<typeof activityLog>;
export type TIUserRole = InferInsertModel<typeof userRoles>;
export type TIChannelRolePermission = InferInsertModel<
  typeof channelRolePermissions
>;
export type TIChannelUserPermission = InferInsertModel<
  typeof channelUserPermissions
>;
export type TIChannelReadState = InferInsertModel<typeof channelReadStates>;
export type TIDirectMessage = InferInsertModel<typeof directMessages>;

export type TStorageSettings = Pick<
  TSettings,
  | 'storageUploadEnabled'
  | 'storageFileSharingInDirectMessages'
  | 'storageQuota'
  | 'storageUploadMaxFileSize'
  | 'storageMaxAvatarSize'
  | 'storageMaxBannerSize'
  | 'storageMaxFilesPerMessage'
  | 'storageSpaceQuotaByUser'
  | 'storageOverflowAction'
>;

// joined types

type TPublicUser = Pick<
  TJoinedUser,
  | 'id'
  | 'name'
  | 'bannerColor'
  | 'bio'
  | 'avatar'
  | 'avatarId'
  | 'banner'
  | 'bannerId'
  | 'banned'
  | 'createdAt'
> & {
  status?: UserStatus;
  _identity?: string;
};

export type TJoinedRole = TRole & {
  permissions: Permission[];
};

export type TJoinedMessageReaction = TMessageReaction & {
  file: TFile | null;
};

export type TJoinedMessage = TMessage & {
  files: TFile[];
  reactions: TJoinedMessageReaction[];
  replyCount?: number;
};

export type TJoinedEmoji = TEmoji & {
  file: TFile;
  user: TPublicUser;
};

export type TJoinedUser = TUser & {
  avatar: TFile | null;
  banner: TFile | null;
  roleIds: number[];
};

export type TJoinedPublicUser = TPublicUser & {
  avatar: TFile | null;
  banner: TFile | null;
  roleIds: number[];
};

export type TJoinedSettings = TSettings & {
  logo: TFile | null;
};

export type TJoinedInvite = TInvite & {
  creator: TJoinedPublicUser;
  role: { id: number; name: string; color: string } | null;
};
