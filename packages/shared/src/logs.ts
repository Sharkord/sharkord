import type { TChannel, TEmoji, TRole, TSettings } from "./tables";
import type { ChannelType } from "./types";

export enum ActivityLogType {
  SERVER_STARTED = "SERVER_STARTED",
  EDIT_SERVER_SETTINGS = "EDIT_SERVER_SETTINGS",
  // -------------------- USERS --------------------
  USER_CREATED = "USER_CREATED",
  USER_JOINED = "USER_JOINED",
  USER_LEFT = "USER_LEFT",
  USER_KICKED = "USER_KICKED",
  USER_BANNED = "USER_BANNED",
  USER_UNBANNED = "USER_UNBANNED",
  // -------------------- ROLES --------------------
  CREATED_ROLE = "CREATED_ROLE",
  DELETED_ROLE = "DELETED_ROLE",
  UPDATED_ROLE = "UPDATED_ROLE",
  UPDATED_DEFAULT_ROLE = "UPDATED_DEFAULT_ROLE",
  // -------------------- CHANNELS --------------------
  CREATED_CHANNEL = "CREATED_CHANNEL",
  DELETED_CHANNEL = "DELETED_CHANNEL",
  UPDATED_CHANNEL = "UPDATED_CHANNEL",
  // -------------------- INVITES --------------------
  CREATED_INVITE = "CREATED_INVITE",
  DELETED_INVITE = "DELETED_INVITE",
  USED_INVITE = "USED_INVITE",
  // -------------------- EMOJIS --------------------
  CREATED_EMOJI = "CREATED_EMOJI",
  DELETED_EMOJI = "DELETED_EMOJI",
  UPDATED_EMOJI = "UPDATED_EMOJI",
}

export type TActivityLogDetailsMap = {
  [ActivityLogType.SERVER_STARTED]: {};
  [ActivityLogType.EDIT_SERVER_SETTINGS]: {
    values: Partial<{
      [K in keyof TSettings]: any;
    }>;
  };
  // -------------------- USERS --------------------
  [ActivityLogType.USER_KICKED]: {
    reason: string | undefined;
    kickedBy: number;
  };
  [ActivityLogType.USER_BANNED]: {
    reason: string | undefined;
    bannedBy: number;
  };
  [ActivityLogType.USER_UNBANNED]: {
    unbannedBy: number;
  };
  [ActivityLogType.USER_CREATED]: {
    inviteCode: string | undefined;
    username: string;
  };
  [ActivityLogType.USER_JOINED]: {
    inviteCode: string | undefined;
  };
  [ActivityLogType.USER_LEFT]: {};
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
    name: string;
  };
};

export type TActivityLogDetails<T extends ActivityLogType = ActivityLogType> = {
  type: T;
  details: TActivityLogDetailsMap[T];
};
