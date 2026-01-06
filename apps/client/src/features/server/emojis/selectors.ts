import type { IRootState } from '@/features/store';
import { getFileUrl } from '@/helpers/get-file-url';
import { createSelector } from '@reduxjs/toolkit';
import type { EmojiItem } from '@tiptap/extension-emoji';

export const emojisSelector = (state: IRootState) => state.server.emojis;

export const customEmojisSelector = createSelector(
  [emojisSelector],
  (emojis) => {
    const items: EmojiItem[] = emojis.map((emoji) => ({
      name: emoji.name,
      shortcodes: [emoji.name],
      tags: ['custom'],
      group: 'Custom',
      fallbackImage: getFileUrl(emoji.file)
    }));

    return items;
  }
);
