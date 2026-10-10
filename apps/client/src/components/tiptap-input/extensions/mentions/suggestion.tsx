import { UserAvatar } from '@/components/user-avatar';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import type { TJoinedPublicUser, TJoinedRole } from '@sharkord/shared';
import type { Editor } from '@tiptap/core';
import { Shield } from 'lucide-react';
import type { Ref } from 'react';
import { createSuggestionRenderer } from '../create-suggestion-renderer';
import { filterByQuery } from '../filter-by-query';
import { SuggestionList, type TSuggestionListRef } from '../suggestion-list';

const MENTION_STORAGE_KEY = 'mentionUsers';

type TMentionItem =
  | { type: 'user'; user: TJoinedPublicUser }
  | { type: 'role'; role: TJoinedRole };

type TMentionStorage = {
  users?: TJoinedPublicUser[];
  roles?: TJoinedRole[];
};

type TMentionListProps = {
  items: TMentionItem[];
  onSelect: (item: TMentionItem) => void;
  ref?: Ref<TSuggestionListRef>;
};

const getMentionItemName = (item: TMentionItem) =>
  item.type === 'user' ? getRenderedUsername(item.user) : item.role.name;

const getKey = (item: TMentionItem) =>
  item.type === 'user' ? `user-${item.user.id}` : `role-${item.role.id}`;

const renderItem = (item: TMentionItem) => {
  if (item.type === 'role') {
    return (
      <>
        <Shield
          className="h-6 w-6 shrink-0 p-1"
          style={{ color: item.role.color }}
        />
        <span className="font-medium truncate">{item.role.name}</span>
      </>
    );
  }

  return (
    <>
      <UserAvatar userId={item.user.id} className="h-6 w-6 shrink-0" />
      <span className="font-medium truncate">
        {getRenderedUsername(item.user)}
      </span>
    </>
  );
};

const MentionList = ({ items, onSelect, ref }: TMentionListProps) => (
  <SuggestionList
    ref={ref}
    items={items}
    onSelect={onSelect}
    getKey={getKey}
    renderItem={renderItem}
    ariaLabel="Mention user or role"
    className="min-w-[16rem] max-w-88"
  />
);

const getMentionItems = ({
  editor,
  query
}: {
  editor: Editor;
  query: string;
}): TMentionItem[] => {
  const storage = (
    editor.storage as unknown as Record<string, TMentionStorage>
  )[MENTION_STORAGE_KEY];
  const users = storage?.users ?? [];
  const roles = storage?.roles ?? [];

  const items: TMentionItem[] = [
    ...users.map((user) => ({ type: 'user' as const, user })),
    ...roles.map((role) => ({ type: 'role' as const, role }))
  ];

  return filterByQuery(items, query, getMentionItemName);
};

const MentionSuggestion = {
  items: getMentionItems,
  allowSpaces: false,
  render: createSuggestionRenderer(MentionList, getMentionItems)
};

export { getMentionItemName, MENTION_STORAGE_KEY, MentionSuggestion };
export type { TMentionItem };
