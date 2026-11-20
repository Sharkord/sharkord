import Emoji, { type EmojiStorage } from '@tiptap/extension-emoji';

let isEmojiSupported: EmojiStorage['isSupported'] | undefined;

export const CachedEmoji = Emoji.extend({
  addStorage() {
    if (!isEmojiSupported) {
      const parentStorage = this.parent?.();

      isEmojiSupported = parentStorage?.isSupported;
    }

    return {
      emojis: this.options.emojis,
      isSupported: isEmojiSupported ?? (() => false)
    };
  }
});
