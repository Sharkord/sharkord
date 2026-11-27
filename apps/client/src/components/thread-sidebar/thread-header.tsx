import { ContentHeader } from '@/components/content-header';
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

    const actions = (
      <>
        <IconButton
          onClick={onToggleFollow}
          icon={isFollowed ? BellOff : Bell}
          title={isFollowed ? t('unfollowThread') : t('followThread')}
          variant="ghost"
          size="sm"
        />
        <IconButton onClick={onClose} icon={X} variant="ghost" size="sm" />
      </>
    );

    return (
      <ContentHeader actions={actions}>
        <MessageSquareText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="font-semibold text-sm">{t('thread')}</span>
        <span className="truncate text-sm text-muted-foreground">
          {channelLabel}
        </span>
      </ContentHeader>
    );
  }
);

export { ThreadHeader };
