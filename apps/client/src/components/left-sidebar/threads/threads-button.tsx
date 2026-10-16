import { UnreadCount } from '@/components/unread-count';
import { setThreadsOpen } from '@/features/server/threads/actions';
import {
  useFollowedThreadsReadState,
  useThreadsOpen
} from '@/features/server/threads/hooks';
import { TestId } from '@sharkord/shared';
import { cn, Tooltip } from '@sharkord/ui';
import { MessageSquareText, X } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const ThreadsButton = memo(() => {
  const { t } = useTranslation('sidebar');
  const threadsOpen = useThreadsOpen();
  const { unreadCount, hasUnreadMention } = useFollowedThreadsReadState();

  const onToggleThreads = useCallback(() => {
    setThreadsOpen(!threadsOpen);
  }, [threadsOpen]);

  return (
    <Tooltip content={threadsOpen ? t('closeThreads') : t('openThreads')}>
      <button
        type="button"
        data-testid={TestId.THREADS_TOGGLE}
        onClick={onToggleThreads}
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          threadsOpen &&
            'bg-accent text-accent-foreground ring-1 ring-inset ring-primary/30'
        )}
      >
        <MessageSquareText className="h-4 w-4" />
        <span className="flex-1 text-left">{t('threads')}</span>
        {threadsOpen && <X className="h-4 w-4" />}
        <UnreadCount count={unreadCount} hasMention={hasUnreadMention} />
      </button>
    </Tooltip>
  );
});

export { ThreadsButton };
