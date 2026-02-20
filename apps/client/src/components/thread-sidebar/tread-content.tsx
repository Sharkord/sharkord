import { TiptapInput } from '@/components/tiptap-input';
import { closeThreadSidebar } from '@/features/app/actions';
import {
  useCan,
  useChannelCan,
  useTypingUsersByThreadId
} from '@/features/server/hooks';
import { useThreadMessages } from '@/features/server/messages/hooks';
import { useFlatPluginCommands } from '@/features/server/plugins/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { useUploadFiles } from '@/hooks/use-upload-files';
import { getTRPCClient } from '@/lib/trpc';
import {
  ChannelPermission,
  Permission,
  TYPING_MS,
  getTrpcError,
  isEmptyMessage
} from '@sharkord/shared';
import { Button, Spinner } from '@sharkord/ui';
import { filesize } from 'filesize';
import { throttle } from 'lodash-es';
import { MessageSquareText, Paperclip, Send, X } from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileCard } from '../channel-view/text/file-card';
import { MessagesGroup } from '../channel-view/text/messages-group';
import { useScrollController } from '../channel-view/text/use-scroll-controller';
import { TypingDots } from '../typing-dots';
import { ParentMessagePreview } from './parent-message-preview';

type TThreadContentProps = {
  parentMessageId: number;
  channelId: number;
};

const ThreadContent = memo(
  ({ parentMessageId, channelId }: TThreadContentProps) => {
    const { messages, hasMore, loadMore, loading, fetching, groupedMessages } =
      useThreadMessages(parentMessageId);

    const allPluginCommands = useFlatPluginCommands();
    const typingUsers = useTypingUsersByThreadId(parentMessageId);

    const { containerRef, onScroll } = useScrollController({
      messages,
      fetching,
      hasMore,
      loadMore,
      hasTypingUsers: typingUsers.length > 0
    });

    const sendingRef = useRef(false);
    const [sending, setSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const can = useCan();
    const channelCan = useChannelCan(channelId);

    const canSendMessages = useMemo(() => {
      return (
        can(Permission.SEND_MESSAGES) &&
        channelCan(ChannelPermission.SEND_MESSAGES)
      );
    }, [can, channelCan]);

    const canUploadFiles = useMemo(() => {
      return (
        can(Permission.SEND_MESSAGES) &&
        can(Permission.UPLOAD_FILES) &&
        channelCan(ChannelPermission.SEND_MESSAGES)
      );
    }, [can, channelCan]);

    const pluginCommands = useMemo(
      () =>
        can(Permission.EXECUTE_PLUGIN_COMMANDS) ? allPluginCommands : undefined,
      [can, allPluginCommands]
    );

    const {
      files,
      removeFile,
      clearFiles,
      uploading,
      uploadingSize,
      openFileDialog,
      fileInputProps
    } = useUploadFiles(!canSendMessages);

    const sendTypingSignal = useMemo(
      () =>
        throttle(async () => {
          const trpc = getTRPCClient();

          try {
            await trpc.messages.signalTyping.mutate({
              channelId,
              parentMessageId
            });
          } catch {
            // ignore
          }
        }, TYPING_MS),
      [channelId, parentMessageId]
    );

    const onSendMessage = useCallback(async () => {
      if (
        (isEmptyMessage(newMessage) && !files.length) ||
        !canSendMessages ||
        sendingRef.current
      ) {
        return;
      }

      setSending(true);
      sendingRef.current = true;
      sendTypingSignal.cancel();

      const trpc = getTRPCClient();

      try {
        await trpc.messages.send.mutate({
          content: newMessage,
          channelId,
          files: files.map((f) => f.id),
          parentMessageId
        });

        playSound(SoundType.MESSAGE_SENT);
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to send reply'));
        return;
      } finally {
        sendingRef.current = false;
        setSending(false);
      }

      setNewMessage('');
      clearFiles();
    }, [
      newMessage,
      channelId,
      files,
      clearFiles,
      sendTypingSignal,
      canSendMessages,
      parentMessageId
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

    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Thread</span>
          </div>
          <button
            type="button"
            onClick={closeThreadSidebar}
            className="p-1 rounded-md hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ParentMessagePreview messageId={parentMessageId} />

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          ) : (
            <>
              {fetching && (
                <div className="h-8 flex items-center justify-center shrink-0">
                  <Spinner size="xs" />
                </div>
              )}

              <div
                ref={containerRef}
                onScroll={onScroll}
                className="flex-1 overflow-y-auto overflow-x-hidden p-2 animate-in fade-in duration-500"
              >
                {messages.length === 0 && !fetching ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                    <MessageSquareText className="h-8 w-8 mb-2 opacity-50" />
                    <p>No replies yet</p>
                    <p className="text-xs">Be the first to reply</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedMessages.map((group, index) => (
                      <MessagesGroup key={index} group={group} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex shrink-0 flex-col gap-2 border-t border-border p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
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
            {/* TODO: make this into a new component and use it everywhere */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground px-1">
                <div className="flex items-center gap-2">
                  <TypingDots className="[&>div]:w-0.5 [&>div]:h-0.5" />
                  <span>
                    {typingUsers.length === 1
                      ? `${typingUsers[0].name} is typing...`
                      : typingUsers.length === 2
                        ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
                        : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg">
              <TiptapInput
                value={newMessage}
                onChange={setNewMessage}
                onSubmit={onSendMessage}
                onTyping={sendTypingSignal}
                disabled={uploading || !canSendMessages}
                readOnly={sending}
                commands={pluginCommands}
              />
              <input {...fileInputProps} />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={uploading || !canUploadFiles}
                onClick={openFileDialog}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={onSendMessage}
                disabled={
                  uploading || sending || files.length === 0 || !canSendMessages
                }
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export { ThreadContent };
