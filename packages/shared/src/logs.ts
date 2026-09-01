/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { TChannel, TRole, TSettings } from './tables';
import type { ChannelType } from './types';

export enum ActivityLogType {
  SERVER_STARTED = 'SERVER_STARTED',
  EDIT_SERVER_SETTINGS = 'EDIT_SERVER_SETTINGS',
  // -------------------- USERS --------------------
  USER_CREATED = 'USER_CREATED',
  USER_JOINED = 'USER_JOINED',
  USER_LEFT = 'USER_LEFT',
  USER_KICKED = 'USER_KICKED',
  USER_BANNED = 'USER_BANNED',
  USER_UNBANNED = 'USER_UNBANNED',
  USER_DELETED = 'USER_DELETED',
  USER_UPDATED_PASSWORD = 'USER_UPDATED_PASSWORD',
  USER_CLAIMED_OWNERSHIP = 'USER_CLAIMED_OWNERSHIP',
  // -------------------- ROLES --------------------
  CREATED_ROLE = 'CREATED_ROLE',
  DELETED_ROLE = 'DELETED_ROLE',
  UPDATED_ROLE = 'UPDATED_ROLE',
  UPDATED_DEFAULT_ROLE = 'UPDATED_DEFAULT_ROLE',
  // -------------------- CHANNELS --------------------
  CREATED_CHANNEL = 'CREATED_CHANNEL',
  DELETED_CHANNEL = 'DELETED_CHANNEL',
  UPDATED_CHANNEL = 'UPDATED_CHANNEL',
  REORDERED_CHANNELS = 'REORDERED_CHANNELS',
  UPDATED_CHANNEL_PERMISSIONS = 'UPDATED_CHANNEL_PERMISSIONS',
  DELETED_CHANNEL_PERMISSIONS = 'DELETED_CHANNEL_PERMISSIONS',
  // -------------------- INVITES --------------------
  CREATED_INVITE = 'CREATED_INVITE',
  DELETED_INVITE = 'DELETED_INVITE',
  USED_INVITE = 'USED_INVITE',
  // -------------------- EMOJIS --------------------
  CREATED_EMOJI = 'CREATED_EMOJI',
  DELETED_EMOJI = 'DELETED_EMOJI',
  UPDATED_EMOJI = 'UPDATED_EMOJI',
  // -------------------- CATEGORIES --------------------
  CREATED_CATEGORY = 'CREATED_CATEGORY',
  DELETED_CATEGORY = 'DELETED_CATEGORY',
  UPDATED_CATEGORY = 'UPDATED_CATEGORY',
  REORDERED_CATEGORIES = 'REORDERED_CATEGORIES',
  // -------------------- PLUGINS --------------------
  EXECUTED_PLUGIN_COMMAND = 'EXECUTED_PLUGIN_COMMAND',
  EXECUTED_PLUGIN_ACTION = 'EXECUTED_PLUGIN_ACTION',
  PLUGIN_TOGGLED = 'PLUGIN_TOGGLED',
  PLUGIN_INSTALLED = 'PLUGIN_INSTALLED',
  PLUGIN_UPDATED = 'PLUGIN_UPDATED',
  PLUGIN_REMOVED = 'PLUGIN_REMOVED',
  PLUGIN_SETTING_UPDATED = 'PLUGIN_SETTING_UPDATED',
  PLUGIN_CAPABILITY_ACCESS_UPDATED = 'PLUGIN_CAPABILITY_ACCESS_UPDATED',
  PLUGIN_CAPABILITY_ACCESS_RESET = 'PLUGIN_CAPABILITY_ACCESS_RESET',
  // -------------------- MESSAGES --------------------
  TOGGLED_MESSAGE_PIN = 'TOGGLED_MESSAGE_PIN'
}

export type TActivityLogDetailsMap = {
  [ActivityLogType.SERVER_STARTED]: {};
  [ActivityLogType.EDIT_SERVER_SETTINGS]: {
    values: Partial<{
      [K in keyof TSettings]: any;
    }>;
  };
  // -------------------- USERS --------------------
  // the "By" fields are absent when a plugin acted, since it is not a user
  [ActivityLogType.USER_KICKED]: {
    reason: string | undefined;
    kickedBy?: number;
  };
  [ActivityLogType.USER_BANNED]: {
    reason: string | undefined;
    bannedBy?: number;
  };
  [ActivityLogType.USER_UNBANNED]: {
    unbannedBy?: number;
  };
  [ActivityLogType.USER_DELETED]: {
    reason: string | undefined;
    deletedBy: number;
  };
  [ActivityLogType.USER_CREATED]: {
    inviteCode: string | undefined;
    username: string;
  };
  [ActivityLogType.USER_JOINED]: {
    inviteCode: string | undefined;
  };
  [ActivityLogType.USER_LEFT]: {};
  [ActivityLogType.USER_UPDATED_PASSWORD]: {};
  [ActivityLogType.USER_CLAIMED_OWNERSHIP]: {};
  // -------------------- ROLES --------------------
  [ActivityLogType.CREATED_ROLE]: {
    roleId: number;
    roleName: string;
  };
  [ActivityLogType.DELETED_ROLE]: {
    roleId: number;
    roleName: string;
  };
  [ActivityLogType.UPDATED_ROLE]: {
    roleId: number;
    permissions: string[];
    values: Partial<TRole>;
  };
  [ActivityLogType.UPDATED_DEFAULT_ROLE]: {
    newRoleId: number;
    oldRoleId: number;
    newRoleName: string;
    oldRoleName: string;
  };
  // -------------------- CHANNELS --------------------
  [ActivityLogType.CREATED_CHANNEL]: {
    channelId: number;
    channelName: string;
    type: ChannelType;
  };
  [ActivityLogType.DELETED_CHANNEL]: {
    channelId: number;
    channelName: string;
  };
  [ActivityLogType.UPDATED_CHANNEL]: {
    channelId: number;
    values: Partial<TChannel>;
  };
  [ActivityLogType.REORDERED_CHANNELS]: {
    categoryId: number;
    channelIds: number[];
  };
  [ActivityLogType.UPDATED_CHANNEL_PERMISSIONS]: {
    channelId: number;
    targetUserId?: number;
    targetRoleId?: number;
    permissions: {
      permission: string;
      allow: boolean;
    }[];
  };
  [ActivityLogType.DELETED_CHANNEL_PERMISSIONS]: {
    channelId: number;
    targetUserId?: number;
    targetRoleId?: number;
  };
  // -------------------- INVITES --------------------
  [ActivityLogType.CREATED_INVITE]: {
    code: string;
    maxUses: number;
    expiresAt: number | null;
  };
  [ActivityLogType.DELETED_INVITE]: {
    code: string;
  };
  [ActivityLogType.USED_INVITE]: {
    code: string;
  };
  // -------------------- EMOJIS --------------------
  [ActivityLogType.CREATED_EMOJI]: {
    name: string;
  };
  [ActivityLogType.DELETED_EMOJI]: {
    name: string;
  };
  [ActivityLogType.UPDATED_EMOJI]: {
    fromName: string;
    toName: string;
  };
  // -------------------- CATEGORIES --------------------
  [ActivityLogType.CREATED_CATEGORY]: {
    categoryId: number;
    categoryName: string;
  };
  [ActivityLogType.DELETED_CATEGORY]: {
    categoryId: number;
    categoryName: string;
    channelIds: number[];
  };
  [ActivityLogType.UPDATED_CATEGORY]: {
    categoryId: number;
    values: Partial<{
      name: string;
      position: number;
    }>;
  };
  [ActivityLogType.REORDERED_CATEGORIES]: {
    categoryIds: number[];
  };
  // -------------------- PLUGINS --------------------
  [ActivityLogType.EXECUTED_PLUGIN_COMMAND]: {
    pluginId: string;
    commandName: string;
    args: Record<string, any>;
  };
  [ActivityLogType.EXECUTED_PLUGIN_ACTION]: {
    pluginId: string;
    actionName: string;
    payload: unknown;
  };
  [ActivityLogType.PLUGIN_TOGGLED]: {
    pluginId: string;
    enabled: boolean;
  };
  [ActivityLogType.PLUGIN_INSTALLED]: {
    pluginId: string;
    version: string;
  };
  [ActivityLogType.PLUGIN_UPDATED]: {
    pluginId: string;
    version: string;
  };
  [ActivityLogType.PLUGIN_REMOVED]: {
    pluginId: string;
  };
  [ActivityLogType.PLUGIN_SETTING_UPDATED]: {
    pluginId: string;
    key: string;
  };
  [ActivityLogType.PLUGIN_CAPABILITY_ACCESS_UPDATED]: {
    pluginId: string;
    capability: string;
    mode: string;
  };
  [ActivityLogType.PLUGIN_CAPABILITY_ACCESS_RESET]: {
    pluginId: string;
    capability: string;
  };
  // -------------------- MESSAGES --------------------
  [ActivityLogType.TOGGLED_MESSAGE_PIN]: {
    messageId: number;
    channelId: number;
    pinned: boolean;
    pinnedBy: number;
  };
};

export type TActivityLogDetails<T extends ActivityLogType = ActivityLogType> = {
  type: T;
  details: TActivityLogDetailsMap[T];
};
