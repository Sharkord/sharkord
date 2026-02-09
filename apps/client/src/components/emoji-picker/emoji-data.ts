import type { TEmojiItem } from '@/components/tiptap-input/types';
import type { EmojiItem } from '@tiptap/extension-emoji';
import { gitHubEmojis } from '@tiptap/extension-emoji';

const EMOJI_CATEGORIES = [
  { id: 'recent', label: 'Recent', icon: '🕐' },
  { id: 'people & body', label: 'People', icon: '😀' },
  { id: 'animals & nature', label: 'Nature', icon: '🐻' },
  { id: 'food & drink', label: 'Food', icon: '🍕' },
  { id: 'activities', label: 'Activities', icon: '⚽' },
  { id: 'travel & places', label: 'Travel', icon: '✈️' },
  { id: 'objects', label: 'Objects', icon: '💡' },
  { id: 'symbols', label: 'Symbols', icon: '💕' },
  { id: 'flags', label: 'Flags', icon: '🏳️' }
];

type EmojiCategoryId = (typeof EMOJI_CATEGORIES)[number]['id'];

const toTEmojiItem = (emoji: EmojiItem): TEmojiItem => ({
  name: emoji.name,
  shortcodes: emoji.shortcodes,
  fallbackImage: emoji.fallbackImage,
  emoji: emoji.emoji
});

const processEmojis = () => {
  const grouped: Record<string, TEmojiItem[]> = {};
  const all: TEmojiItem[] = [];

  for (const category of EMOJI_CATEGORIES) {
    grouped[category.id] = [];
  }

  for (const emoji of gitHubEmojis) {
    if (!emoji.emoji || !emoji.group) continue;
    if (emoji.group === 'components' || emoji.group === 'GitHub') continue;

    const converted = toTEmojiItem(emoji);

    if (grouped[emoji.group]) {
      grouped[emoji.group].push(converted);
      all.push(converted);
    }
  }

  return { grouped, all };
};

const { grouped: GROUPED_EMOJIS, all: ALL_EMOJIS } = processEmojis();

const searchEmojis = (emojis: TEmojiItem[], query: string): TEmojiItem[] => {
  if (!query.trim()) return emojis;

  const lowerQuery = query.toLowerCase();

  return emojis.filter(
    (emoji) =>
      emoji.name.toLowerCase().includes(lowerQuery) ||
      emoji.shortcodes.some((sc) => sc.toLowerCase().includes(lowerQuery))
  );
};

const getEmojisByCategory = (categoryId: EmojiCategoryId): TEmojiItem[] =>
  GROUPED_EMOJIS[categoryId] || [];

const GRID_COLS = 8;
const EMOJI_SIZE = 32; // px
const ROW_HEIGHT = 36; // px (emoji size + gap)

export {
  ALL_EMOJIS,
  EMOJI_CATEGORIES,
  EMOJI_SIZE,
  getEmojisByCategory,
  GRID_COLS,
  GROUPED_EMOJIS,
  ROW_HEIGHT,
  searchEmojis,
  toTEmojiItem,
  type EmojiCategoryId
};
