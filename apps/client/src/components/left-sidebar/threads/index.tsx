import { setFollowedThreadsPage } from '@/features/server/threads/actions';
import {
  useFollowedThreadsCursor,
  useFollowedThreadsList
} from '@/features/server/threads/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import { Button, Spinner } from '@sharkord/ui';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SectionHeader } from '../section-header';
import { ThreadItem } from './thread-item';

const Threads = memo(() => {
  const { t } = useTranslation('sidebar');
  const threads = useFollowedThreadsList();
  const cursor = useFollowedThreadsCursor();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchFirstPage = useCallback(async () => {
    try {
      const trpc = getTRPCClient();
      const page = await trpc.threads.getFollowed.query({});

      setFollowedThreadsPage(page.threads, page.nextCursor, false);
    } catch (error) {
      toast.error(getTrpcError(error, t('failedLoadThreads')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const onLoadMore = useCallback(async () => {
    if (!cursor) return;

    setLoadingMore(true);

    try {
      const trpc = getTRPCClient();
      const page = await trpc.threads.getFollowed.query({ cursor });

      setFollowedThreadsPage(page.threads, page.nextCursor, true);
    } catch (error) {
      toast.error(getTrpcError(error, t('failedLoadThreads')));
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, t]);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <SectionHeader title={t('threads')} />

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="space-y-1">
          {threads.map((thread) => (
            <ThreadItem key={thread.parentMessageId} thread={thread} />
          ))}
          {threads.length === 0 && (
            <div className="px-2 py-4 text-xs text-muted-foreground">
              {t('noFollowedThreads')}
            </div>
          )}
          {cursor && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {t('loadMoreThreads')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

export { Threads };
