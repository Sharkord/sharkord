import { UnreadCount } from '@/components/unread-count';
import { UserAvatar } from '@/components/user-avatar';
import { setSelectedDmChannelId } from '@/features/app/actions';
import { useSelectedDmChannelId } from '@/features/app/hooks';
import { useVisibleDirectMessages } from '@/features/server/dms/hooks';
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
  getTrpcError,
  TestId,
  type TDirectMessageConversation
} from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { X } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SectionHeader } from '../section-header';
import { SearchUserDropdown } from './search-user-dropdown';

type TDirectMessageItemProps = {
  dm: TDirectMessageConversation;
  selected: boolean;
};

const DirectMessageItem = memo(({ dm, selected }: TDirectMessageItemProps) => {
  const { t } = useTranslation('sidebar');
  const user = useUserById(dm.userId);
  const unreadCount = useUnreadMessagesCount(dm.channelId);

  const onSelect = useCallback(() => {
    setSelectedDmChannelId(dm.channelId);
  }, [dm.channelId]);

  const onClose = useCallback(async () => {
    try {
      const trpc = getTRPCClient();

      await trpc.dms.close.mutate({ channelId: dm.channelId });

      if (selected) setSelectedDmChannelId(undefined);
    } catch (error) {
      toast.error(getTrpcError(error, t('couldNotCloseDM')));
    }
  }, [dm.channelId, selected, t]);

  if (!user) {
    return null;
  }

  return (
    <div
      data-testid={TestId.DM_ITEM}
      className={cn(
        'group flex w-full items-center rounded text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        selected && 'bg-accent text-accent-foreground'
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5"
        onClick={onSelect}
      >
        <UserAvatar userId={user.id} className="h-6 w-6" showUserPopover />
        <span className="truncate flex-1 text-left">{user.name}</span>
        <UnreadCount count={unreadCount} />
      </button>
      <IconButton
        icon={X}
        variant="ghost"
        size="sm"
        title={t('closeConversation')}
        onClick={onClose}
        data-testid={TestId.DM_CLOSE}
        className="mr-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      />
    </div>
  );
});

const DirectMessages = memo(() => {
  const { t } = useTranslation('sidebar');
  const conversations = useVisibleDirectMessages();
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
      <SectionHeader title={t('directMessages')}>
        <SearchUserDropdown
          query={query}
          setQuery={setQuery}
          usersToStartDm={usersToStartDm}
          onStartDm={onStartDm}
        />
      </SectionHeader>

      <div className="space-y-0.5">
        {conversations.map((dm) => (
          <DirectMessageItem
            key={dm.channelId}
            dm={dm}
            selected={selectedDmChannelId === dm.channelId}
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
