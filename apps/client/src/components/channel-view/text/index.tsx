import { TiptapInput } from '@/components/tiptap-input';
import Spinner from '@/components/ui/spinner';
import { useCan, useChannelCan } from '@/features/server/hooks';
import { useMessages } from '@/features/server/messages/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { useUploadFiles } from '@/hooks/use-upload-files';
import { getTRPCClient } from '@/lib/trpc';
import { ChannelPermission, Permission, TYPING_MS } from '@sharkord/shared';
import { filesize } from 'filesize';
import { throttle } from 'lodash-es';
import { Send } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { FileCard } from './file-card';
import { MessagesGroup } from './messages-group';
import { TextSkeleton } from './text-skeleton';
import { useScrollController } from './use-scroll-controller';
import { UsersTyping } from './users-typing';

type TChannelProps = {
  channelId: number;
};

const TextChannel = memo(({ channelId }: TChannelProps) => {
  const { messages, hasMore, loadMore, loading, fetching, groupedMessages } =
    useMessages(channelId);
  const [newMessage, setNewMessage] = useState('');
  const { containerRef, onScroll } = useScrollController({
    messages,
    fetching,
    hasMore,
    loadMore
  });
  const can = useCan();
  const channelCan = useChannelCan(channelId);
  const canSendMessages = useMemo(() => {
    return (
      can(Permission.SEND_MESSAGES) &&
      channelCan(ChannelPermission.SEND_MESSAGES)
    );
  }, [can, channelCan]);

  const { files, removeFile, clearFiles, uploading, uploadingSize } =
    useUploadFiles(!canSendMessages);

  const sendTypingSignal = useMemo(
    () =>
      throttle(async () => {
        const trpc = getTRPCClient();

        try {
          await trpc.messages.signalTyping.mutate({ channelId });
        } catch {
          // ignore
        }
      }, TYPING_MS),
    [channelId]
  );

  const onSendMessage = useCallback(async () => {
    if ((!newMessage.trim() && !files.length) || !canSendMessages) return;

    sendTypingSignal.cancel();

    const trpc = getTRPCClient();

    try {
      await trpc.messages.send.mutate({
        content: newMessage,
        channelId,
        files: files.map((f) => f.id)
      });

      playSound(SoundType.MESSAGE_SENT);
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to send message'));
      return;
    }

    setNewMessage('');
    clearFiles();
  }, [
    newMessage,
    channelId,
    files,
    clearFiles,
    sendTypingSignal,
    canSendMessages
  ]);

  const onRemoveFileClick = useCallback(
    async (fileId: string) => {
      removeFile(fileId);

      const trpc = getTRPCClient();

      try {
        trpc.files.deleteTemporary.mutate({ fileId });
      } catch {
        // ignore error
      }
    },
    [removeFile]
  );

  if (!channelCan(ChannelPermission.VIEW_CHANNEL) || loading) {
    return <TextSkeleton />;
  }

  return (
    <>
      {fetching && (
        <div className="absolute top-0 left-0 right-0 h-12 z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg">
            <Spinner size="xs" />
            <span className="text-sm text-muted-foreground">
              Fetching older messages...
            </span>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto p-2 animate-in fade-in duration-500"
      >
        <div className="space-y-4">
          {groupedMessages.map((group, index) => (
            <MessagesGroup key={index} group={group} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border p-2">
        {uploading && (
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground mb-1">
              Uploading files ({filesize(uploadingSize)})
            </div>
            <Spinner size="xxs" />
          </div>
        )}
        {files.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {files.map((file) => (
              <FileCard
                key={file.id}
                name={file.originalName}
                extension={file.extension}
                size={file.size}
                onRemove={() => onRemoveFileClick(file.id)}
              />
            ))}
          </div>
        )}
        <UsersTyping channelId={channelId} />
        <div className="flex items-center gap-2 rounded-lg">
          <TiptapInput
            value={newMessage}
            onChange={setNewMessage}
            onSubmit={onSendMessage}
            onTyping={sendTypingSignal}
            disabled={uploading || !canSendMessages}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onSendMessage}
            disabled={uploading || !newMessage.trim() || !canSendMessages}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
});

export { TextChannel };
