import type { TTempFile } from '../types';

export enum FileSaveType {
  MESSAGE = 'message',
  AVATAR = 'avatar',
  BANNER = 'banner',
  EMOJI = 'emoji',
  SERVER_LOGO = 'server_logo'
}

export type TBeforeFileSavePayload = {
  tempFile: TTempFile;
  userId: number;
  type: FileSaveType;
};

export type TBeforeFileSaveResult = string | void;

export type TBeforeFileSaveHook = (
  payload: TBeforeFileSavePayload
) => Promise<TBeforeFileSaveResult>;
