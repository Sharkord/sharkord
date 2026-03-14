import { UnreadCount } from '@/components/unread-count';
import { UserAvatar } from '@/components/user-avatar';
import { setSelectedDmChannelId } from '@/features/app/actions';
import {
  useDmConversations,
  useSelectedDmChannelId
} from '@/features/app/hooks';
import { useUnreadMessagesCount } from '@/features/server/hooks';
import {
  useOwnUserId,
  useUserById,
  useUsers
} from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  type TDirectMessageConversation
} from '@sharkord/shared';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SearchUserDropdown } from './search-user-dropdown';

type TDirectMessageItemProps = {
  dm: TDirectMessageConversation;
  selected: boolean;
  onSelect: () => void;
};

const DirectMessageItem = memo(
  ({ dm, selected, onSelect }: TDirectMessageItemProps) => {
    const user = useUserById(dm.userId);
    const unreadCount = useUnreadMessagesCount(dm.channelId);

    if (!user) {
      return null;
    }

    return (
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          selected && 'bg-accent text-accent-foreground'
        )}
        onClick={onSelect}
      >
        <UserAvatar userId={user.id} className="h-6 w-6" showUserPopover />
        <span className="truncate flex-1 text-left">{user.name}</span>
        <UnreadCount count={unreadCount} />
      </button>
    );
  }
);

const DirectMessages = memo(() => {
  const { t } = useTranslation('sidebar');
  const conversations = useDmConversations();
  const [query, setQuery] = useState('');
  const users = useUsers();
  const ownUserId = useOwnUserId();
  const selectedDmChannelId = useSelectedDmChannelId();

  const usersToStartDm = useMemo(() => {
    const directMessageUserIds = new Set(conversations.map((dm) => dm.userId));

    return users.filter(
      (user) =>
        user.id !== ownUserId &&
        !user.banned &&
        user.name !== DELETED_USER_IDENTITY_AND_NAME &&
        !directMessageUserIds.has(user.id) &&
        user.name.toLowerCase().includes(query.trim().toLowerCase())
    );
  }, [conversations, ownUserId, query, users]);

  const onStartDm = useCallback(
    async (userId: number) => {
      const trpc = getTRPCClient();

      try {
        const result = await trpc.dms.open.mutate({ userId });

        setSelectedDmChannelId(result.channelId);
      } catch {
        toast.error(t('couldNotOpenDM'));
      }
    },
    [t]
  );

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="mb-1 flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold text-muted-foreground">
          {t('directMessages')}
        </span>
        <SearchUserDropdown
          query={query}
          setQuery={setQuery}
          usersToStartDm={usersToStartDm}
          onStartDm={onStartDm}
        />
      </div>

      <div className="space-y-0.5">
        {conversations.map((dm) => (
          <DirectMessageItem
            key={dm.channelId}
            dm={dm}
            selected={selectedDmChannelId === dm.channelId}
            onSelect={() => setSelectedDmChannelId(dm.channelId)}
          />
        ))}
        {conversations.length === 0 && (
          <div className="px-2 py-4 text-xs text-muted-foreground">
            {t('noDMsYet')}
          </div>
        )}
      </div>
    </div>
  );
});

export { DirectMessages };
