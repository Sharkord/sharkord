import { isEmojiOnlyMessage, type TJoinedMessage } from '@sharkord/shared';
import parse, { type DOMNode } from 'html-react-parser';
import type { ReactNode } from 'react';
import { readFromCache, writeToCache } from './lru-cache';
import { serializer } from './serializer';

const parsedMessageCache = new Map<string, ReactNode>();
const emojiOnlyCache = new Map<string, boolean>();

const hashContent = (content: string) => {
  let hash = 0;

  for (let i = 0; i < content.length; i++) {
    hash = (Math.imul(31, hash) + content.charCodeAt(i)) | 0;
  }

  return hash.toString(36);
};

// the content has to take part in the key because a plugin command rewrites a
// message's content without touching editedAt
const getMessageContentCacheKey = (message: TJoinedMessage) =>
  `${message.id}:${message.editedAt ?? 0}:${hashContent(message.content ?? '')}`;

const getParsedMessageHtml = (message: TJoinedMessage) => {
  const cacheKey = getMessageContentCacheKey(message);
  const cached = readFromCache(parsedMessageCache, cacheKey);

  if (cached !== undefined) return cached;

  const parsed = parse(message.content ?? '', {
    replace: (domNode: DOMNode) => serializer(domNode, message.id)
  });

  writeToCache(parsedMessageCache, cacheKey, parsed);

  return parsed;
};

const getIsEmojiOnly = (message: TJoinedMessage) => {
  const cacheKey = getMessageContentCacheKey(message);
  const cached = readFromCache(emojiOnlyCache, cacheKey);

  if (cached !== undefined) return cached;

  const emojiOnly = isEmojiOnlyMessage(message.content);

  writeToCache(emojiOnlyCache, cacheKey, emojiOnly);

  return emojiOnly;
};

export { getIsEmojiOnly, getParsedMessageHtml };
