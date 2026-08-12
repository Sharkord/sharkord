export * from './metrics';
export * from './permissions';
export * from './storage';
export * from './upload';

export const DEFAULT_MESSAGES_LIMIT = 100;
export const MESSAGE_MAX_LENGTH = 10_000;

// a reaction is either a unicode emoji (long ZWJ sequences included) or the
// name of a custom server emoji, which add-emoji caps at 32
export const REACTION_EMOJI_MAX_LENGTH = 32;

export const OWNER_ROLE_ID = 1;

export const TYPING_MS = 300;

export enum DisconnectCode {
  UNEXPECTED = 1006,
  KICKED = 40000,
  BANNED = 40001,
  SERVER_SHUTDOWN = 40002
}

export const DELETED_USER_IDENTITY_AND_NAME = '__deleted_user__'; // this will be used as identity AND name, but in the interface we render as "Deleted"

export const DEFAULT_BITRATE = 6000; // kbps,
