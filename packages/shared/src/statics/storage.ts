export enum StorageOverflowAction {
  DELETE_OLD_FILES = 'delete', // when new uploads exceed the quota, delete the oldest files
  PREVENT_UPLOADS = 'prevent' // when new uploads exceed the quota, prevent new uploads
}

export const STORAGE_OVERFLOW_ACTIONS_DICT = {
  [StorageOverflowAction.DELETE_OLD_FILES]: 'Delete old files',
  [StorageOverflowAction.PREVENT_UPLOADS]: 'Prevent new file uploads'
};

export const STORAGE_OVERFLOW_ACTIONS_DESCRIPTION: {
  [key: string]: string;
} = {
  [StorageOverflowAction.DELETE_OLD_FILES]:
    'When new uploads exceed the quota, the server will automatically delete the oldest files to make room for new uploads.',
  [StorageOverflowAction.PREVENT_UPLOADS]:
    'When new uploads exceed the quota, the server will prevent new uploads until the user deletes some files manually.'
};

export type TStorageData = {
  userId: number;
  fileCount: number;
  usedStorage: number;
};

export const STORAGE_QUOTA = 100 * 1024 * 1024 * 1024; // 100GB
export const STORAGE_MIN_QUOTA = 1 * 1024 * 1024 * 1024; // 1GB
export const STORAGE_MAX_QUOTA = 1 * 1024 * 1024 * 1024 * 1024; // 1TB

export const STORAGE_MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
export const STORAGE_MIN_FILE_SIZE = 1 * 1024 * 1024; // 1MB
export const STORAGE_MAX_QUOTA_PER_USER = 100 * 1024 * 1024 * 1024; // 100GB
export const STORAGE_MIN_QUOTA_PER_USER = 0; // unlimited
export const STORAGE_DEFAULT_MAX_AVATAR_SIZE = 3 * 1024 * 1024; // 3MB
export const STORAGE_DEFAULT_MAX_BANNER_SIZE = 3 * 1024 * 1024; // 3MB
export const STORAGE_MAX_AVATAR_SIZE = 50 * 1024 * 1024; // 50MB
export const STORAGE_MAX_BANNER_SIZE = 100 * 1024 * 1024; // 100MB
export const STORAGE_DEFAULT_MAX_FILES_PER_MESSAGE = 10;
export const STORAGE_MIN_FILES_PER_MESSAGE = 0;
export const STORAGE_MAX_FILES_PER_MESSAGE = 20;
export const STORAGE_OVERFLOW_ACTION = StorageOverflowAction.PREVENT_UPLOADS;
