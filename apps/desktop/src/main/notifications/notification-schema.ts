import { PLUGIN_NOTIFICATION_DATA_MAX_LENGTH } from '@sharkord/shared';
import { z } from 'zod';

const MAX_DATA_ICON_LENGTH = 512_000; // 512 KB
const MAX_TITLE_LENGTH = 200; // 200 characters
const MAX_BODY_LENGTH = 1000; // 1000 characters
const MAX_RAW_TEXT_LENGTH = 100_000; // 100 KB
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
        JSON.stringify(data).length <= PLUGIN_NOTIFICATION_DATA_MAX_LENGTH,
      'plugin data too large'
    )
    .optional()
});

const truncate = (maxLength: number) => (text: string) => {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
};

const notificationSchema = z.object({
  title: z
    .string()
    .max(MAX_RAW_TEXT_LENGTH)
    .transform(truncate(MAX_TITLE_LENGTH)),
  body: z
    .string()
    .max(MAX_RAW_TEXT_LENGTH)
    .transform(truncate(MAX_BODY_LENGTH)),
  icon: iconSchema.optional().catch(undefined),
  target: z
    .discriminatedUnion('type', [messageTargetSchema, pluginTargetSchema])
    .optional()
});

export { notificationSchema };
