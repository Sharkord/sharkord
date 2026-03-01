import { RelativeTime } from '@/components/relative-time';
import { requestConfirmation } from '@/features/dialogs/actions';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  imageExtensions,
  isEmojiOnlyMessage,
  type TJoinedMessage
} from '@sharkord/shared';
import { Tooltip } from '@sharkord/ui';
import parse from 'html-react-parser';
import { memo, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { FileCard } from '../file-card';
import { MessageReactions } from '../message-reactions';
import { ImageOverride } from '../overrides/image';
import { serializer } from './serializer';
import type { TFoundMedia } from './types';

type TMessageRendererProps = {
  message: TJoinedMessage;
  disableFiles?: boolean;
  disableReactions?: boolean;
};

const MessageRenderer = memo(
  ({ message, disableFiles, disableReactions }: TMessageRendererProps) => {
    const ownUserId = useOwnUserId();
    const editedByUser = useUserById(message.editedBy ?? -1);
    const isOwnMessage = useMemo(
      () => message.userId === ownUserId,
      [message.userId, ownUserId]
    );

    const emojiOnly = useMemo(
      () => isEmojiOnlyMessage(message.content),
      [message.content]
    );

    const { foundMedia, messageHtml } = useMemo(() => {
      const foundMedia: TFoundMedia[] = [];

      const messageHtml = parse(message.content ?? '', {
        replace: (domNode) =>
          serializer(domNode, (found) => foundMedia.push(found), message.id)
      });

      return { messageHtml, foundMedia };
    }, [message.content, message.id]);

    const onRemoveFileClick = useCallback(async (fileId: number) => {
      if (!fileId) return;

      const choice = await requestConfirmation({
        title: 'Delete file',
        message: 'Are you sure you want to delete this file?',
        confirmLabel: 'Delete'
      });

      if (!choice) return;

      const trpc = getTRPCClient();

      try {
        await trpc.files.delete.mutate({
          fileId
        });

        toast.success('File deleted');
      } catch {
        toast.error('Failed to delete file');
      }
    }, []);

    const allMedia = useMemo(() => {
      const mediaFromFiles: TFoundMedia[] = message.files
        .filter((file) =>
          imageExtensions.includes(file.extension.toLowerCase())
        )
        .map((file) => ({
          type: 'image',
          url: getFileUrl(file)
        }));

      return [...foundMedia, ...mediaFromFiles];
    }, [foundMedia, message.files]);

    return (
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            'prose max-w-full wrap-break-word msg-content',
            emojiOnly && 'emoji-only'
          )}
        >
          {messageHtml}
          {message.editedAt ? (
            <Tooltip
              content={
                <div className="flex flex-col gap-1">
                  <RelativeTime date={new Date(message.editedAt)}>
                    {(relativeTime) => (
                      <span className="text-secondary text-xs">
                        {editedByUser
                          ? getRenderedUsername(editedByUser)
                          : 'Unknown User'}{' '}
                        {relativeTime}
                      </span>
                    )}
                  </RelativeTime>
                </div>
              }
            >
              <span className="msg-edit ml-1 text-xs text-muted-foreground">
                (edited)
              </span>
            </Tooltip>
          ) : (
            <span></span>
          )}
        </div>

        {allMedia.map((media, index) => {
          if (media.type === 'image') {
            return (
              <ImageOverride src={media.url} key={`media-image-${index}`} />
            );
          }

          return null;
        })}

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
