import { TiptapInput } from '@/components/tiptap-input';
import { useCan, useChannelCan } from '@/features/server/hooks';
import { useFlatPluginCommands } from '@/features/server/plugins/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { useUploadFiles } from '@/hooks/use-upload-files';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedPublicUser } from '@sharkord/shared';
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
import { Paperclip, Send } from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileCard } from '../channel-view/text/file-card';
import { UsersTypingIndicator } from '../channel-view/text/users-typing';

type TThreadComposeProps = {
  parentMessageId: number;
  channelId: number;
  typingUsers: TJoinedPublicUser[];
};

const ThreadCompose = memo(
  ({ parentMessageId, channelId, typingUsers }: TThreadComposeProps) => {
    const sendingRef = useRef(false);
    const [sending, setSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const can = useCan();
    const channelCan = useChannelCan(channelId);
    const allPluginCommands = useFlatPluginCommands();

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
        <UsersTypingIndicator typingUsers={typingUsers} />
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
    );
  }
);

export { ThreadCompose };
