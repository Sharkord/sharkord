import type { TChannel } from '@sharkord/shared';
import type { Editor } from '@tiptap/core';
import { Hash } from 'lucide-react';
import type { Ref } from 'react';
import { createSuggestionRenderer } from '../create-suggestion-renderer';
import { filterByQuery } from '../filter-by-query';
import { SuggestionList, type TSuggestionListRef } from '../suggestion-list';

const CHANNEL_REF_STORAGE_KEY = 'channelRefChannels';

type TChannelListProps = {
  items: TChannel[];
  onSelect: (item: TChannel) => void;
  ref?: Ref<TSuggestionListRef>;
};

const getKey = (item: TChannel) => item.id;

const getName = (item: TChannel) => item.name;

const renderItem = (item: TChannel) => (
  <>
    <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
    <span className="font-medium truncate">{item.name}</span>
  </>
);

const ChannelList = ({ items, onSelect, ref }: TChannelListProps) => (
  <SuggestionList
    ref={ref}
    items={items}
    onSelect={onSelect}
    getKey={getKey}
    renderItem={renderItem}
    ariaLabel="Reference channel"
    className="min-w-[16rem] max-w-88"
  />
);

const getChannels = ({
  editor,
  query
}: {
  editor: Editor;
  query: string;
}): TChannel[] => {
  const channels: TChannel[] =
    (editor.storage as unknown as Record<string, { channels?: TChannel[] }>)[
      CHANNEL_REF_STORAGE_KEY
    ]?.channels ?? [];

  return filterByQuery(channels, query, getName);
};

const ChannelReferenceSuggestion = {
  items: getChannels,
  allowSpaces: false,
  render: createSuggestionRenderer(ChannelList, getChannels)
};

export { CHANNEL_REF_STORAGE_KEY, ChannelReferenceSuggestion };
