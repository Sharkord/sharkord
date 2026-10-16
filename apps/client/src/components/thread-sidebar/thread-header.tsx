import { useIsThreadFollowed } from '@/features/server/threads/hooks';
import { useChannelLabel } from '@/hooks/use-channel-label';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { Bell, BellOff, MessageSquareText, X } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TThreadHeaderProps = {
  parentMessageId: number;
  channelId: number;
  onClose: () => void;
};

const ThreadHeader = memo(
  ({ parentMessageId, channelId, onClose }: TThreadHeaderProps) => {
    const { t } = useTranslation('common');
    const isFollowed = useIsThreadFollowed(parentMessageId);
    const channelLabel = useChannelLabel(channelId);

    const onToggleFollow = useCallback(async () => {
      try {
        const trpc = getTRPCClient();

        await trpc.threads.setFollow.mutate({
          parentMessageId,
          follow: !isFollowed
        });
      } catch (error) {
        toast.error(getTrpcError(error, t('failedUpdateThreadFollow')));
      }
    }, [parentMessageId, isFollowed, t]);

    return (
      <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <div className="flex min-w-0 items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">{t('thread')}</span>
          <span className="truncate text-sm text-muted-foreground">
            {channelLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            onClick={onToggleFollow}
            icon={isFollowed ? BellOff : Bell}
            title={isFollowed ? t('unfollowThread') : t('followThread')}
            variant="ghost"
            size="sm"
            className="rounded-md hover:bg-accent transition-colors"
          />
          <IconButton
            onClick={onClose}
            icon={X}
            variant="ghost"
            size="sm"
            className="rounded-md hover:bg-accent transition-colors"
          />
        </div>
      </div>
    );
  }
);

export { ThreadHeader };
