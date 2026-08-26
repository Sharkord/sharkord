import z from 'zod';

export const zPluginId = z
  .string()
  .min(1, 'Plugin ID is required')
  .regex(
    /^[a-z0-9-]+$/,
    'Plugin ID must contain only lowercase letters, numbers, and dashes'
  );

export const zHttpUrl = z.url({ protocol: /^https?$/ });
