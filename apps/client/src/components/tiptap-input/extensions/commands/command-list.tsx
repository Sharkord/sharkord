import type { TCommandInfo } from '@sharkord/shared';
import type { Ref } from 'react';
import { SuggestionList, type TSuggestionListRef } from '../suggestion-list';

type TCommandListProps = {
  items: TCommandInfo[];
  onSelect: (item: TCommandInfo) => void;
  ref?: Ref<TSuggestionListRef>;
};

const getKey = (item: TCommandInfo) => `${item.pluginId}:${item.name}`;

const renderItem = (item: TCommandInfo) => (
  <>
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground shrink-0">/</span>
      <span className="font-medium truncate">{item.name}</span>
      <span className="text-[10px] text-muted-foreground ml-auto truncate">
        {item.pluginId}
      </span>
    </div>
    {item.description && (
      <span className="text-xs text-muted-foreground truncate">
        {item.description}
      </span>
    )}
  </>
);

const CommandList = ({ items, onSelect, ref }: TCommandListProps) => (
  <SuggestionList
    ref={ref}
    items={items}
    onSelect={onSelect}
    getKey={getKey}
    renderItem={renderItem}
    ariaLabel="Run command"
    className="min-w-[16rem] max-w-[22rem]"
    itemClassName="flex-col items-stretch gap-0.5"
  />
);

export { CommandList };
