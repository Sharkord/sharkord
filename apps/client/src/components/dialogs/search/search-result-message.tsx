import { useMessageAuthorName } from '@/components/channel-view/text/hooks/use-message-author-name';
import { MessageRenderer } from '@/components/channel-view/text/renderer';
import { PluginAvatar } from '@/components/plugin-avatar';
import { RelativeTime } from '@/components/relative-time';
import { UserAvatar } from '@/components/user-avatar';
import { usePluginMetadata } from '@/features/server/plugins/hooks';
import type { TMessageJumpToTarget } from '@/types';
import { IconButton, Tooltip } from '@sharkord/ui';
import { ArrowRight, Hash } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TSearchResultMessage } from './types';

type TSearchResultMessageCardProps = {
  message: TSearchResultMessage;
  onJump: (target: TMessageJumpToTarget) => void;
};

const SearchResultMessageCard = memo(
  ({ message, onJump }: TSearchResultMessageCardProps) => {
    const { t } = useTranslation('dialogs');
    const isPluginMessage = !!message.pluginId;
    const plugin = usePluginMetadata(message.pluginId);
    const authorName = useMessageAuthorName(message);

    const handleJump = useCallback(() => {
      onJump({
        channelId: message.channelId,
        messageId: message.parentMessageId ?? message.id,
        isDm: message.channelIsDm
      });
    }, [onJump, message]);

    return (
      <div className="w-full overflow-hidden rounded-lg border border-border bg-card px-3 py-2 text-left">
        <div className="flex min-w-0 items-start gap-3">
          {isPluginMessage ? (
            <PluginAvatar
              name={plugin?.name}
              avatarUrl={plugin?.avatarUrl}
              className="h-7 w-7"
            />
          ) : (
            <UserAvatar userId={message.userId!} className="h-7 w-7" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="max-w-55 truncate font-medium text-foreground">
                {authorName}
              </span>
              <span>•</span>
              <RelativeTime date={new Date(message.createdAt)}>
                {(relativeTime) => <span>{relativeTime}</span>}
              </RelativeTime>
              <span>•</span>
              <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                <Hash className="h-3 w-3" />
                <span className="truncate wrap-anywhere">
                  {message.channelName}
                </span>
              </span>
              {!!message.parentMessageId && (
                <>
                  <span>•</span>
                  <span>{t('inThread')}</span>
                </>
              )}
            </div>
            <div className="mt-1 min-w-0 overflow-hidden">
              <div className="max-h-64 overflow-y-auto overflow-x-hidden pr-1">
                <MessageRenderer
                  message={message}
                  disableReactions
                  disableFiles
                />
              </div>
            </div>
          </div>
          <Tooltip
            content={
              message.parentMessageId
                ? t('jumpToThreadMessage')
                : t('jumpToMessage')
            }
          >
            <IconButton
              icon={ArrowRight}
              variant="ghost"
              size="sm"
              onClick={handleJump}
            />
          </Tooltip>
        </div>
      </div>
    );
  }
);

export { SearchResultMessageCard };
