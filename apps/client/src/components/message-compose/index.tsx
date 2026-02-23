import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { TiptapInput } from '@/components/tiptap-input';
import { useCan, useChannelCan } from '@/features/server/hooks';
import { useFlatPluginCommands } from '@/features/server/plugins/hooks';
import { useUploadFiles } from '@/hooks/use-upload-files';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedPublicUser, TTempFile } from '@sharkord/shared';
import {
  ChannelPermission,
  Permission,
  PluginSlot,
  isEmptyMessage
} from '@sharkord/shared';
import { Button, Spinner } from '@sharkord/ui';
import { filesize } from 'filesize';
import { Paperclip, Send } from 'lucide-react';
import {
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref
} from 'react';
import { FileCard } from '../channel-view/text/file-card';
import { UsersTypingIndicator } from '../channel-view/text/users-typing';

type TMessageComposeProps = {
  channelId: number;
  message: string;
  onMessageChange: (value: string) => void;
  onSend: (message: string, files: TTempFile[]) => Promise<boolean>;
  onTyping: () => void;
  typingUsers: TJoinedPublicUser[];
  showPluginSlot?: boolean;
  ref?: Ref<TMessageComposeHandle>;
};

type TMessageComposeHandle = {
  clearFiles: () => void;
};

const MessageCompose = memo(
  ({
    channelId,
    message,
    onMessageChange,
    onSend,
    onTyping,
    typingUsers,
    showPluginSlot = false,
    ref
  }: TMessageComposeProps) => {
    const sendingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [sending, setSending] = useState(false);
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
    } = useUploadFiles(containerRef, !canSendMessages);

    useImperativeHandle(ref, () => ({ clearFiles }), [clearFiles]);

    const handleSend = useCallback(async () => {
      if (
        (isEmptyMessage(message) && !files.length) ||
        !canSendMessages ||
        sendingRef.current
      ) {
        return;
      }

      setSending(true);
      sendingRef.current = true;

      const success = await onSend(message, files);

      sendingRef.current = false;
      setSending(false);

      if (success) {
        clearFiles();
      }
    }, [message, files, canSendMessages, onSend, clearFiles]);

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
      <div
        ref={containerRef}
        className="flex shrink-0 flex-col gap-2 border-t border-border p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
      >
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
            value={message}
            onChange={onMessageChange}
            onSubmit={handleSend}
            onTyping={onTyping}
            disabled={uploading || !canSendMessages}
            readOnly={sending}
            commands={pluginCommands}
          />
          {showPluginSlot && (
            <PluginSlotRenderer slotId={PluginSlot.CHAT_ACTIONS} />
          )}
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
            onClick={handleSend}
            disabled={uploading || sending || !canSendMessages}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }
);

export { MessageCompose, type TMessageComposeHandle };
