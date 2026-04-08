import { RelativeTime } from '@/components/relative-time';
import { requestConfirmation } from '@/features/dialogs/actions';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  audioExtensions,
  imageExtensions,
  isEmojiOnlyMessage,
  videoExtensions,
  type TJoinedMessage
} from '@sharkord/shared';
import { Tooltip } from '@sharkord/ui';
import parse from 'html-react-parser';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FileCard } from '../file-card';
import { MessageReactions } from '../message-reactions';
import { AudioOverride } from '../overrides/audio';
import { ImageOverride } from '../overrides/image';
import { VideoOverride } from '../overrides/video';
import { serializer } from './serializer';
import type { TFoundMedia } from './types';

type TMessageRendererProps = {
  message: TJoinedMessage;
  disableFiles?: boolean;
  disableReactions?: boolean;
};

const ALLOWED_MEDIA_TYPES = ['image', 'video', 'audio'];

const MessageRenderer = memo(
  ({ message, disableFiles, disableReactions }: TMessageRendererProps) => {
    const { t } = useTranslation();
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

    const messageHtml = useMemo(
      () =>
        parse(message.content ?? '', {
          replace: (domNode) => serializer(domNode, message.id)
        }),
      [message.content, message.id]
    );

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

    const allMedia = useMemo(() => {
      const mediaFromFiles: TFoundMedia[] = message.files
        .map((file) => {
          const extension = file.extension.toLowerCase();

          if (imageExtensions.includes(extension)) {
            return {
              type: 'image',
              url: getFileUrl(file)
            } as const;
          }

          if (videoExtensions.includes(extension)) {
            return {
              type: 'video',
              url: getFileUrl(file)
            } as const;
          }

          if (audioExtensions.includes(extension)) {
            return {
              type: 'audio',
              url: getFileUrl(file)
            } as const;
          }

          return undefined;
        })
        .filter((media) => !!media) as TFoundMedia[];

      const mediaFromMetadata: TFoundMedia[] = (message.metadata ?? [])
        .map((metadata) => {
          if (!metadata || !metadata.url) return undefined;

          const isAllowedType = ALLOWED_MEDIA_TYPES.includes(
            metadata.mediaType
          );

          if (!isAllowedType) return undefined;

          return {
            type: metadata.mediaType,
            url: metadata.url
          };
        })
        .filter((media) => !!media) as TFoundMedia[];

      return [...mediaFromFiles, ...mediaFromMetadata];
    }, [message.files, message.metadata]);

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

        {allMedia.map((media, index) => {
          if (media.type === 'image') {
            return (
              <ImageOverride src={media.url} key={`media-image-${index}`} />
            );
          }

          if (media.type === 'video') {
            return (
              <VideoOverride src={media.url} key={`media-video-${index}`} />
            );
          }

          if (media.type === 'audio') {
            return (
              <AudioOverride src={media.url} key={`media-audio-${index}`} />
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
