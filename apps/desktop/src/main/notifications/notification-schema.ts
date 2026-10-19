import { z } from 'zod';

const MAX_DATA_ICON_LENGTH = 512_000;
const MAX_PLUGIN_DATA_LENGTH = 4096;
const DATA_ICON_REGEX =
  /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i;

const iconSchema = z.union([
  z.url({ protocol: /^https?$/ }),
  z.string().max(MAX_DATA_ICON_LENGTH).regex(DATA_ICON_REGEX)
]);

const messageTargetSchema = z.object({
  type: z.literal('message'),
  channelId: z.number().int(),
  messageId: z.number().int(),
  parentMessageId: z.number().int().optional(),
  isDm: z.boolean()
});

const pluginTargetSchema = z.object({
  type: z.literal('plugin'),
  pluginId: z.string().min(1).max(128),
  data: z
    .unknown()
    .refine(
      (data) =>
        data === undefined ||
        JSON.stringify(data).length <= MAX_PLUGIN_DATA_LENGTH,
      'plugin data too large'
    )
    .optional()
});

const notificationSchema = z.object({
  title: z.string().max(200),
  body: z.string().max(1000),
  icon: iconSchema.optional(),
  target: z
    .discriminatedUnion('type', [messageTargetSchema, pluginTargetSchema])
    .optional()
});

export { notificationSchema };
