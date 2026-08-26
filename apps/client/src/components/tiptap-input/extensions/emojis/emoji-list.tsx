import type { Ref } from 'react';
import { shouldUseFallbackImage, type TEmojiItem } from '../../helpers';
import { SuggestionList, type TSuggestionListRef } from '../suggestion-list';

type TEmojiListProps = {
  items: TEmojiItem[];
  onSelect: (item: TEmojiItem) => void;
  ref?: Ref<TSuggestionListRef>;
};

const getKey = (item: TEmojiItem) => item.shortcodes[0];

const renderItem = (item: TEmojiItem) => (
  <>
    {item.emoji && !shouldUseFallbackImage(item) ? (
      <span className="text-base shrink-0">{item.emoji}</span>
    ) : item.fallbackImage ? (
      <img
        src={item.fallbackImage}
        alt={item.name}
        className="size-4 shrink-0 rounded-sm"
      />
    ) : null}
    <span className="truncate text-muted-foreground">{item.name}</span>
  </>
);

const EmojiList = ({ items, onSelect, ref }: TEmojiListProps) => (
  <SuggestionList
    ref={ref}
    items={items}
    onSelect={onSelect}
    getKey={getKey}
    renderItem={renderItem}
    ariaLabel="Insert emoji"
    className="min-w-[12rem] max-w-[16rem]"
  />
);

export { EmojiList };
