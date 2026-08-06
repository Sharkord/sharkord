import type { Editor } from '@tiptap/core';
import type { TEmojiItem } from '../../helpers';
import { createSuggestionRenderer } from '../create-suggestion-renderer';
import { EmojiList } from './emoji-list';

const EMOJI_SUGGESTION_LIMIT = 5;

const getEmojis = ({
  editor,
  query
}: {
  editor: Editor;
  query: string;
}): TEmojiItem[] => {
  const emojis: TEmojiItem[] =
    (editor.storage as unknown as Record<string, { emojis?: TEmojiItem[] }>)
      .emoji?.emojis ?? [];

  const normalizedQuery = query.toLowerCase();

  return emojis
    .filter(
      (emoji) =>
        emoji.shortcodes.some((shortcode) =>
          shortcode.toLowerCase().startsWith(normalizedQuery)
        ) || emoji.name.toLowerCase().startsWith(normalizedQuery)
    )
    .slice(0, EMOJI_SUGGESTION_LIMIT);
};

export const EmojiSuggestion = {
  items: getEmojis,
  allowSpaces: false,
  render: createSuggestionRenderer(EmojiList, getEmojis)
};
