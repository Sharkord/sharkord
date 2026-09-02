/**
 * What every hook may answer.
 *
 * - return nothing to allow it unchanged
 * - return `{ update }` to change what gets written
 * - return `{ reject: 'reason' }` to refuse, with a reason the user sees
 *
 * Throwing is not a refusal. It means the plugin is broken: the error is
 * logged, the user gets a generic message, and the operation fails closed.
 * Mutating the payload does nothing, since each handler gets its own copy.
 */
export type TPluginHookResult<TUpdate> =
  | void
  | { update: TUpdate }
  | { reject: string };

/** a hook that can allow or refuse but has nothing to change */
export type TPluginGateResult = TPluginHookResult<never>;

/** What a file being saved is for, so a hook can treat them differently. */
export enum FileSaveType {
  MESSAGE = 'message',
  AVATAR = 'avatar',
  BANNER = 'banner',
  EMOJI = 'emoji',
  SERVER_LOGO = 'server_logo'
}

export type TBeforeFileSavePayload = {
  /** the whole file in memory, replaceable through the update */
  bytes: Uint8Array;
  /** what the uploader called it, before the host makes it unique on disk */
  originalName: string;
  /** lowercased, with the dot */
  extension: string;
  size: number;
  userId?: number;
  type: FileSaveType;
};

export type TBeforeFileSaveUpdate = {
  bytes?: Uint8Array;
  originalName?: string;
};

/**
 * Runs before any file is stored: message attachments, avatars, banners,
 * emojis and the server logo, told apart by `type`.
 *
 * Sees the bytes and may replace them, so it is where scanning, stripping
 * metadata and re-encoding belong. Runs before the size and quota checks, so a
 * replacement is measured, not the original.
 */
export type TBeforeFileSaveHook = (
  payload: TBeforeFileSavePayload
) => Promise<TPluginHookResult<TBeforeFileSaveUpdate>>;

/** Whether a message is being sent for the first time or edited. */
export enum MessageSaveType {
  CREATE = 'create',
  EDIT = 'edit'
}

export type TBeforeMessageSavePayload = {
  /** sanitized HTML, which is also what an update must return */
  content: string;
  /** the plain text of that HTML, for matching against */
  textContent: string;
  channelId: number;
  userId: number;
  type: MessageSaveType;
  /** present on an edit, absent on a send */
  messageId?: number;
};

export type TBeforeMessageSaveUpdate = {
  content?: string;
};

/**
 * Runs before a message is stored, on both sends and edits. Where moderation,
 * filtering, translation and link scrubbing belong.
 *
 * `content` is sanitized HTML and `textContent` the plain text of it, so match
 * on the text and return HTML. A replacement is sanitized again, and one that
 * leaves nothing behind is refused.
 */
export type TBeforeMessageSaveHook = (
  payload: TBeforeMessageSavePayload
) => Promise<TPluginHookResult<TBeforeMessageSaveUpdate>>;

/** `userId` is absent when a plugin is creating the channel. */
export type TBeforeChannelCreatePayload = {
  name: string;
  type: string;
  categoryId: number;
  userId?: number; // not present when it's a plugin creating the channel
};

export type TBeforeChannelCreateUpdate = {
  name?: string;
};

/**
 * Runs before a channel is created, whether a person or a plugin is creating
 * it. Can rename it, which is where naming conventions belong. A replacement
 * that is blank is refused.
 */
export type TBeforeChannelCreateHook = (
  payload: TBeforeChannelCreatePayload
) => Promise<TPluginHookResult<TBeforeChannelCreateUpdate>>;

export type TBeforeVoiceJoinPayload = {
  channelId: number;
  userId: number;
  /** true when a moderator moved them rather than the user choosing to join */
  movedByModerator: boolean;
};

/**
 * Runs before someone joins a voice channel. A gate only: allow or refuse, with
 * nothing to change. Check `movedByModerator` before refusing, or a moderator
 * moving someone will be blocked by rules meant for the user.
 */
export type TBeforeVoiceJoinHook = (
  payload: TBeforeVoiceJoinPayload
) => Promise<TPluginGateResult>;

export type TBeforeLoginPayload = {
  identity: string;
  /** absent when it cannot be determined, so treat it as unknown, not trusted */
  ip: string | undefined;
  /** false when this login would create the account */
  isExistingUser: boolean;
};

/**
 * Runs before a login is accepted, after the password is checked. A gate only.
 * Where allowlists, IP blocks and registration rules belong.
 *
 * It runs on an unauthenticated request, so a slow handler slows down everyone
 * signing in.
 */
export type TBeforeLoginHook = (
  payload: TBeforeLoginPayload
) => Promise<TPluginGateResult>;
