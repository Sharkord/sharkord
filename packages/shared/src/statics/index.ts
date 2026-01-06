export * from "./permissions";
export * from "./storage";
export * from "./metrics";

export const DEFAULT_MESSAGES_LIMIT = 100;

export const OWNER_ROLE_ID = 1;

export const TYPING_MS = 300;

export enum DisconnectCode {
  UNEXPECTED = 1006,
  KICKED = 40000,
  BANNED = 40001,
  SERVER_SHUTDOWN = 40002,
}
