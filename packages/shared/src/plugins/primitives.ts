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
