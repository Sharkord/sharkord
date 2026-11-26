import {
  useTotalHasUnreadMentions,
  useTotalUnreadCount
} from '@/features/server/hooks';
import { cn } from '@/lib/utils';
import { IconButton, UnreadCount } from '@sharkord/ui';
import { Menu } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const MAX_BADGE_COUNT = 99;

type TChannelListButtonProps = {
  onClick: () => void;
};

const ChannelListButton = memo(({ onClick }: TChannelListButtonProps) => {
  const { t } = useTranslation('topbar');
  const unreadCount = useTotalUnreadCount();
  const hasUnreadMentions = useTotalHasUnreadMentions();
  const fitsBadge = unreadCount <= MAX_BADGE_COUNT;

  return (
    <div className="relative flex md:hidden">
      <IconButton
        icon={Menu}
        variant="ghost"
        onClick={onClick}
        aria-label={t('openChannelList')}
      />
      {fitsBadge && (
        <UnreadCount
          count={unreadCount}
          hasMention={hasUnreadMentions}
          className="pointer-events-none absolute -top-2 -right-3 ml-0 h-4 min-w-4 px-1 text-[10px] leading-none"
        />
      )}
      {!fitsBadge && (
        <span
          className={cn(
            'pointer-events-none absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-white',
            hasUnreadMentions && 'bg-red-500'
          )}
        />
      )}
    </div>
  );
});

export { ChannelListButton };
