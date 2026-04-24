import { RelativeTime } from '@/components/relative-time';
import { requestConfirmation } from '@/features/dialogs/actions';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { type TJoinedMessage } from '@sharkord/shared';
import { Tooltip } from '@sharkord/ui';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FileCard } from '../file-card';
import { MessageReactions } from '../message-reactions';
import { getIsEmojiOnly, getParsedMessageHtml } from './content-cache';
import { extractMessageOpenGraph } from './helpers';
import { Media } from './media';
import { extractMessageMedia } from './media-cache';
import { OpenGraph } from './open-graph';

type TMessageRendererProps = {
  message: TJoinedMessage;
  disableFiles?: boolean;
  disableReactions?: boolean;
};

const MessageRenderer = memo(
  ({ message, disableFiles, disableReactions }: TMessageRendererProps) => {
    const { t } = useTranslation();
    const ownUserId = useOwnUserId();
    const editedByUser = useUserById(message.editedBy ?? -1);
    const isOwnMessage = useMemo(
      () => message.userId === ownUserId,
      [message.userId, ownUserId]
    );

    const emojiOnly = useMemo(() => getIsEmojiOnly(message), [message]);

    const messageHtml = useMemo(() => getParsedMessageHtml(message), [message]);

    const onRemoveFileClick = useCallback(
      async (fileId: number) => {
        if (!fileId) return;

        const choice = await requestConfirmation({
          title: t('deleteFileTitle'),
          message: t('deleteFileMsg'),
          confirmLabel: t('deleteLabel')
        });

        if (!choice) return;

        const trpc = getTRPCClient();

        try {
          await trpc.files.delete.mutate({
            fileId
          });

          toast.success(t('fileDeleted'));
        } catch {
          toast.error(t('failedDeleteFile'));
        }
      },
      [t]
    );

    const allMedia = useMemo(() => extractMessageMedia(message), [message]);
    const openGraphPreviews = useMemo(
      () => extractMessageOpenGraph(message, allMedia),
      [message, allMedia]
    );

    return (
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            'prose max-w-full wrap-break-word msg-content',
            emojiOnly && 'emoji-only',
            message.editedAt && 'msg-edited'
          )}
        >
          {messageHtml}
          {message.editedAt && (
            <Tooltip
              content={
                <div className="flex flex-col gap-1">
                  <RelativeTime date={new Date(message.editedAt)}>
                    {(relativeTime) => (
                      <span className="text-secondary text-xs">
                        {editedByUser
                          ? getRenderedUsername(editedByUser)
                          : t('unknownUser')}{' '}
                        {relativeTime}
                      </span>
                    )}
                  </RelativeTime>
                </div>
              }
            >
              <span className="msg-edit ml-1 text-xs text-muted-foreground">
                {t('edited')}
              </span>
            </Tooltip>
          )}
        </div>

        <Media media={allMedia} />
        <OpenGraph previews={openGraphPreviews} />

        {!disableReactions && (
          <MessageReactions
            reactions={message.reactions}
            messageId={message.id}
          />
        )}

        {message.files.length > 0 && !disableFiles && (
          <div className="flex gap-1 flex-wrap">
            {message.files.map((file) => (
              <FileCard
                key={file.id}
                name={file.originalName}
                extension={file.extension}
                size={file.size}
                onRemove={
                  isOwnMessage ? () => onRemoveFileClick(file.id) : undefined
                }
                href={getFileUrl(file)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

export { MessageRenderer };
