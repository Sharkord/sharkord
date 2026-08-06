import { UserAvatar } from '@/components/user-avatar';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import type { TJoinedPublicUser } from '@sharkord/shared';
import type { Editor } from '@tiptap/core';
import type { Ref } from 'react';
import { createSuggestionRenderer } from '../create-suggestion-renderer';
import { filterByQuery } from '../filter-by-query';
import { SuggestionList, type TSuggestionListRef } from '../suggestion-list';

const MENTION_STORAGE_KEY = 'mentionUsers';

type TUserListProps = {
  items: TJoinedPublicUser[];
  onSelect: (item: TJoinedPublicUser) => void;
  ref?: Ref<TSuggestionListRef>;
};

const getKey = (item: TJoinedPublicUser) => item.id;

const renderItem = (item: TJoinedPublicUser) => (
  <>
    <UserAvatar userId={item.id} className="h-6 w-6 shrink-0" />
    <span className="font-medium truncate">{getRenderedUsername(item)}</span>
  </>
);

const UserList = ({ items, onSelect, ref }: TUserListProps) => (
  <SuggestionList
    ref={ref}
    items={items}
    onSelect={onSelect}
    getKey={getKey}
    renderItem={renderItem}
    ariaLabel="Mention user"
    className="min-w-[16rem] max-w-88"
  />
);

const getUsers = ({
  editor,
  query
}: {
  editor: Editor;
  query: string;
}): TJoinedPublicUser[] => {
  const users: TJoinedPublicUser[] =
    (
      editor.storage as unknown as Record<
        string,
        { users?: TJoinedPublicUser[] }
      >
    )[MENTION_STORAGE_KEY]?.users ?? [];

  return filterByQuery(users, query, getRenderedUsername);
};

const MentionSuggestion = {
  items: getUsers,
  allowSpaces: false,
  render: createSuggestionRenderer(UserList, getUsers)
};

export { MENTION_STORAGE_KEY, MentionSuggestion };
