import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedEmoji } from '@sharkord/shared';
import { addEmoji, removeEmoji, updateEmoji } from './actions';

const subscribeToEmojis = () => {
  const trpc = getTRPCClient();

  const onEmojiCreateSub = trpc.emojis.onCreate.subscribe(undefined, {
    onData: (emoji: TJoinedEmoji) => {
      logDebug('[EVENTS] emojis.onCreate', { emoji });
      addEmoji(emoji);
    },
    onError: (err) => console.error('onEmojiCreate subscription error:', err)
  });

  const onEmojiDeleteSub = trpc.emojis.onDelete.subscribe(undefined, {
    onData: (emojiId: number) => {
      logDebug('[EVENTS] emojis.onDelete', { emojiId });
      removeEmoji(emojiId);
    },
    onError: (err) => console.error('onEmojiDelete subscription error:', err)
  });

  const onEmojiUpdateSub = trpc.emojis.onUpdate.subscribe(undefined, {
    onData: (emoji: TJoinedEmoji) => {
      logDebug('[EVENTS] emojis.onUpdate', { emoji });
      updateEmoji(emoji.id, emoji);
    },
    onError: (err) => console.error('onEmojiUpdate subscription error:', err)
  });

  return () => {
    onEmojiCreateSub.unsubscribe();
    onEmojiDeleteSub.unsubscribe();
    onEmojiUpdateSub.unsubscribe();
  };
};

export { subscribeToEmojis };
