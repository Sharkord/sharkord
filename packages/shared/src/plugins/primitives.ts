import z from 'zod';

export const zPluginId = z
  .string()
  .min(1, 'Plugin ID is required')
  .max(64, 'Plugin ID must be at most 64 characters')
  .regex(
    /^[a-z0-9-]+$/,
    'Plugin ID must contain only lowercase letters, numbers, and dashes'
  );

export const zHttpUrl = z.url({ protocol: /^https?$/ });

export const PLUGIN_USER_DATA_MAX_BYTES = 64 * 1024; // 64 kb

export type TPluginPushEvent = {
  pluginId: string;
  data: unknown;
};

export const PLUGIN_PUSH_MAX_BYTES = 64 * 1024; // 64 kb

export const PLUGIN_MESSAGE_COMPONENTS_MAX_BYTES = 16 * 1024; // 16 kb

export const PLUGIN_MESSAGE_COMPONENTS_MAX = 5;

export const PLUGIN_MESSAGE_COMPONENT_NAME_MAX_LENGTH = 64;

export const PLUGIN_STORAGE_KEY_MAX_LENGTH = 256;

export const PLUGIN_STORAGE_VALUE_MAX_BYTES = 64 * 1024; // 64 kb

export const PLUGIN_STORAGE_LIST_MAX_LIMIT = 1000;
