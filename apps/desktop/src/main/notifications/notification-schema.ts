import { z } from 'zod';

const notificationSchema = z.object({
  title: z.string().max(200),
  body: z.string().max(1000),
  icon: z.url({ protocol: /^https?$/ }).optional(),
  target: z
    .object({
      channelId: z.number().int(),
      messageId: z.number().int(),
      parentMessageId: z.number().int().optional(),
      isDm: z.boolean()
    })
    .optional()
});

export { notificationSchema };
