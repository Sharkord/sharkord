import { setDmsOpen } from '@/features/server/actions';
import { useDirectMessagesUnreadCount } from '@/features/server/channels/hooks';
import { useDmsOpen } from '@/features/server/hooks';
import { useThreadsOpen } from '@/features/server/threads/hooks';
import { TestId } from '@sharkord/shared';
import { cn, Tooltip } from '@sharkord/ui';
import { MessageCircleMore, X } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const DmButton = memo(() => {
  const { t } = useTranslation('sidebar');
  const directMessagesUnreadCount = useDirectMessagesUnreadCount();
  const dmsOpen = useDmsOpen();
  const threadsOpen = useThreadsOpen();
  const isActive = dmsOpen && !threadsOpen;

  const onToggleDmMode = useCallback(() => {
    setDmsOpen(!isActive);
  }, [isActive]);

  return (
    <Tooltip
      content={isActive ? t('closeDirectMessages') : t('openDirectMessages')}
    >
      <button
        data-testid={TestId.DM_TOGGLE}
        type="button"
        onClick={onToggleDmMode}
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          isActive &&
            'bg-accent text-accent-foreground ring-1 ring-inset ring-primary/30'
        )}
      >
        <MessageCircleMore className="h-4 w-4" />
        <span className="flex-1 text-left">{t('directMessages')}</span>
        {isActive && <X className="h-4 w-4" />}
        {directMessagesUnreadCount > 0 && (
          <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
            {directMessagesUnreadCount > 99 ? '99+' : directMessagesUnreadCount}
          </div>
        )}
      </button>
    </Tooltip>
  );
});

export { DmButton };
