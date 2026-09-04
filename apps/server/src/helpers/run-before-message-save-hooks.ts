import {
  getPlainTextFromHtml,
  isEmptyMessage,
  MessageSaveType,
  type TBeforeMessageSavePayload
} from '@sharkord/shared';
import { pluginManager } from '../plugins';
import { runHook } from '../plugins/run-hook';
import { invariant } from '../utils/invariant';
import { sanitizeMessageHtml } from './sanitize-html';

type TRunBeforeMessageSaveOptions = {
  content: string;
  channelId: number;
  userId: number;
  type: MessageSaveType;
  messageId?: number;
};

const runBeforeMessageSaveHooks = async ({
  content,
  channelId,
  userId,
  type,
  messageId
}: TRunBeforeMessageSaveOptions): Promise<string> => {
  const entries = pluginManager.getHooks('beforeMessageSave');

  if (entries.length === 0) return content;

  const result = await runHook<TBeforeMessageSavePayload, { content?: string }>(
    {
      entries,
      payload: {
        content,
        textContent: getPlainTextFromHtml(content),
        channelId,
        userId,
        type,
        messageId
      },
      normalize: (payload, pluginId) => {
        const sanitized = sanitizeMessageHtml(payload.content);

        invariant(!isEmptyMessage(sanitized), {
          code: 'BAD_REQUEST',
          message: `Plugin '${pluginId}' replaced this message with empty content.`
        });

        return {
          ...payload,
          content: sanitized,
          textContent: getPlainTextFromHtml(sanitized)
        };
      }
    }
  );

  return result.content;
};

export { runBeforeMessageSaveHooks };
