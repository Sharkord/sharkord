import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import {
  TiptapInput,
  type TTiptapInputHandle
} from '@/components/tiptap-input';
import { useChannelById } from '@/features/server/channels/hooks';
import {
  useCan,
  useChannelCan,
  usePublicServerSettings
} from '@/features/server/hooks';
import { useFlatPluginCommands } from '@/features/server/plugins/hooks';
import { useUploadFiles } from '@/hooks/use-upload-files';
import { getTRPCClient } from '@/lib/trpc';
import type { TReplyTarget } from '@/types';
import type { TJoinedPublicUser, TTempFile } from '@sharkord/shared';
import {
  ChannelPermission,
  Permission,
  PluginSlot,
  isEmptyMessage
} from '@sharkord/shared';
import { Button, Spinner } from '@sharkord/ui';
import { filesize } from 'filesize';
import { Paperclip, Reply, Send, X } from 'lucide-react';
import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref
} from 'react';
import { useTranslation } from 'react-i18next';
import { useMessageAuthorName } from '../channel-view/text/hooks/use-message-author-name';
import { PreviewFile } from '../channel-view/text/preview-file';
import { UsersTypingIndicator } from '../channel-view/text/users-typing';

type TMessageComposeProps = {
  channelId: number;
  message: string;
  onMessageChange: (value: string) => void;
  onSend: (message: string, files: TTempFile[]) => Promise<boolean>;
  onTyping: () => void;
  typingUsers: TJoinedPublicUser[];
  showPluginSlot?: boolean;
  replyTarget?: TReplyTarget;
  onCancelReply?: () => void;
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
    replyTarget,
    onCancelReply,
    ref
  }: TMessageComposeProps) => {
    const { t } = useTranslation('common');
    const sendingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<TTiptapInputHandle>(null);
    const [sending, setSending] = useState(false);
    const can = useCan();
    const channelCan = useChannelCan(channelId);
    const channel = useChannelById(channelId);
    const publicSettings = usePublicServerSettings();
    const allPluginCommands = useFlatPluginCommands();
    const replyAuthorName = useMessageAuthorName({
      userId: replyTarget?.userId ?? 0,
      pluginId: replyTarget?.pluginId ?? ''
    });

    const canSendMessages = useMemo(() => {
      return (
        can(Permission.SEND_MESSAGES) &&
        channelCan(ChannelPermission.SEND_MESSAGES)
      );
    }, [can, channelCan]);

    const canUploadFiles = useMemo(() => {
      const canShareFilesInDm =
        !channel?.isDm || !!publicSettings?.storageFileSharingInDirectMessages;

      return (
        can(Permission.SEND_MESSAGES) &&
        can(Permission.UPLOAD_FILES) &&
        channelCan(ChannelPermission.SEND_MESSAGES) &&
        canShareFilesInDm
      );
    }, [can, channelCan, channel, publicSettings]);

    const pluginCommands = useMemo(
      () => (can(Permission.USE_PLUGINS) ? allPluginCommands : undefined),
      [can, allPluginCommands]
    );

    const {
      files,
      displayItems,
      removeFile,
      clearFiles,
      uploading,
      uploadingSize,
      uploadSpeed,
      openFileDialog,
      fileInputProps
    } = useUploadFiles(channelId, containerRef, !canSendMessages);

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

      const maxFilesPerMessage =
        publicSettings?.storageMaxFilesPerMessage ?? Number.MAX_SAFE_INTEGER;
      const filesToSend = files.slice(0, Math.max(0, maxFilesPerMessage));

      const success = await onSend(message, filesToSend);

      sendingRef.current = false;
      setSending(false);

      if (success) {
        clearFiles();
      }
    }, [message, files, canSendMessages, onSend, clearFiles, publicSettings]);

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

    useEffect(() => {
      // focus the input when user clicks on reply
      if (replyTarget) {
        inputRef.current?.focus();
      }
    }, [replyTarget]);

    return (
      <div
        ref={containerRef}
        className="flex shrink-0 flex-col gap-2 p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
      >
        {uploading && (
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground mb-1">
              Uploading files ({filesize(uploadingSize)})
              {uploadSpeed > 0 && ` - ${filesize(uploadSpeed)}/s`}
            </div>
            <Spinner size="xxs" />
          </div>
        )}

        {displayItems.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {displayItems.map((item) => (
              <PreviewFile
                key={item.id}
                item={item}
                onRemove={
                  item.file ? () => onRemoveFileClick(item.file!.id) : undefined
                }
              />
            ))}
          </div>
        )}

        <UsersTypingIndicator typingUsers={typingUsers} />
        <div className="flex items-center gap-2 rounded-lg">
          <div className="flex flex-col gap-1 w-full justify-center">
            {replyTarget && (
              <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs">
                <div className="min-w-0 flex items-center gap-1.5 text-muted-foreground">
                  <Reply className="h-3.5 w-3.5 shrink-0" />
                  <span>{t('replyingTo', { username: replyAuthorName })}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  onClick={onCancelReply}
                  title={t('cancelReply')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <div className="flex w-full gap-1 items-center">
              <TiptapInput
                ref={inputRef}
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
        </div>
      </div>
    );
  }
);

export { MessageCompose, type TMessageComposeHandle };
