import { isEmojiOnlyMessage, type TJoinedMessage } from '@sharkord/shared';
import parse, { type DOMNode } from 'html-react-parser';
import type { ReactNode } from 'react';
import { serializer } from './serializer';

const MAX_CACHE_SIZE = 500;

const parsedMessageCache = new Map<string, ReactNode>();
const emojiOnlyCache = new Map<string, boolean>();

const trimCache = (cache: Map<string, unknown>) => {
  if (cache.size < MAX_CACHE_SIZE) {
    return;
  }

  const oldestKey = cache.keys().next().value;

  if (oldestKey) {
    cache.delete(oldestKey);
  }
};

const getMessageContentCacheKey = (message: TJoinedMessage) =>
  `${message.id}:${message.editedAt ?? 0}:${message.content ?? ''}`;

const getParsedMessageHtml = (message: TJoinedMessage) => {
  const cacheKey = getMessageContentCacheKey(message);

  if (parsedMessageCache.has(cacheKey)) {
    return parsedMessageCache.get(cacheKey);
  }

  trimCache(parsedMessageCache);

  const parsed = parse(message.content ?? '', {
    replace: (domNode: DOMNode) => serializer(domNode, message.id)
  });

  parsedMessageCache.set(cacheKey, parsed);

  return parsed;
};

const getIsEmojiOnly = (message: TJoinedMessage) => {
  const cacheKey = getMessageContentCacheKey(message);

  if (emojiOnlyCache.has(cacheKey)) {
    return emojiOnlyCache.get(cacheKey)!;
  }

  trimCache(emojiOnlyCache);

  const emojiOnly = isEmojiOnlyMessage(message.content);

  emojiOnlyCache.set(cacheKey, emojiOnly);

  return emojiOnly;
};

export { getIsEmojiOnly, getParsedMessageHtml };
