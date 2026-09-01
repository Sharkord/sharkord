export type TPluginHookResult<TUpdate> =
  | void
  | { update: TUpdate }
  | { reject: string };

export type TPluginGateResult = TPluginHookResult<never>;

export enum FileSaveType {
  MESSAGE = 'message',
  AVATAR = 'avatar',
  BANNER = 'banner',
  EMOJI = 'emoji',
  SERVER_LOGO = 'server_logo'
}

export type TBeforeFileSavePayload = {
  bytes: Uint8Array;
  originalName: string;
  extension: string;
  size: number;
  userId?: number;
  type: FileSaveType;
};

export type TBeforeFileSaveUpdate = {
  bytes?: Uint8Array;
  originalName?: string;
};

export type TBeforeFileSaveHook = (
  payload: TBeforeFileSavePayload
) => Promise<TPluginHookResult<TBeforeFileSaveUpdate>>;

export enum MessageSaveType {
  CREATE = 'create',
  EDIT = 'edit'
}

export type TBeforeMessageSavePayload = {
  content: string;
  textContent: string;
  channelId: number;
  userId: number;
  type: MessageSaveType;
  messageId?: number;
};

export type TBeforeMessageSaveUpdate = {
  content?: string;
};

export type TBeforeMessageSaveHook = (
  payload: TBeforeMessageSavePayload
) => Promise<TPluginHookResult<TBeforeMessageSaveUpdate>>;

export type TBeforeChannelCreatePayload = {
  name: string;
  type: string;
  categoryId: number;
  userId?: number; // not present when it's a plugin creating the channel
};

export type TBeforeChannelCreateUpdate = {
  name?: string;
};

export type TBeforeChannelCreateHook = (
  payload: TBeforeChannelCreatePayload
) => Promise<TPluginHookResult<TBeforeChannelCreateUpdate>>;

export type TBeforeVoiceJoinPayload = {
  channelId: number;
  userId: number;
  movedByModerator: boolean;
};

export type TBeforeVoiceJoinHook = (
  payload: TBeforeVoiceJoinPayload
) => Promise<TPluginGateResult>;

export type TBeforeLoginPayload = {
  identity: string;
  ip: string | undefined;
  isExistingUser: boolean;
};

export type TBeforeLoginHook = (
  payload: TBeforeLoginPayload
) => Promise<TPluginGateResult>;
