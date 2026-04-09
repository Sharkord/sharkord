import { EmojiPicker } from '@/components/emoji-picker';
import { useRecentEmojis } from '@/components/emoji-picker/use-recent-emojis';
import { Protect } from '@/components/protect';
import {
  shouldUseFallbackImage,
  type TEmojiItem
} from '@/components/tiptap-input/helpers';
import { openThreadSidebar } from '@/features/app/actions';
import { useIsShiftHeld } from '@/features/app/hooks';
import { requestConfirmation } from '@/features/dialogs/actions';
import { getTRPCClient } from '@/lib/trpc';
import { Permission } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import {
  MessageSquareText,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Smile,
  Trash,
  Trash2
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const MAX_QUICK_EMOJIS = 4;

type TMessageActionsProps = {
  messageId: number;
  channelId: number;
  onEdit: () => void;
  onReply?: () => void;
  canManage: boolean;
  editable: boolean;
  isThreadReply?: boolean;
  isPinned?: boolean;
  disablePin?: boolean;
};

const MessageActions = memo(
  ({
    onEdit,
    messageId,
    channelId,
    canManage,
    editable,
    isThreadReply,
    isPinned,
    disablePin,
    onReply
  }: TMessageActionsProps) => {
    const { t } = useTranslation();
    const { recentEmojis } = useRecentEmojis();
    const recentEmojisToShow = useMemo(
      () => recentEmojis.slice(0, MAX_QUICK_EMOJIS),
      [recentEmojis]
    );

    const isShiftHeld = useIsShiftHeld();

    const onDeleteClick = useCallback(async () => {
      if (!isShiftHeld) {
        const choice = await requestConfirmation({
          title: t('deleteMessageTitle'),
          message: t('deleteMessageConfirm'),
          confirmLabel: t('deleteLabel'),
          cancelLabel: t('cancel')
        });

        if (!choice) return;
      }

      const trpc = getTRPCClient();
      try {
        await trpc.messages.delete.mutate({ messageId });
        toast.success(t('messageDeleted'));
      } catch {
        toast.error(t('failedDeleteMessage'));
      }
    }, [isShiftHeld, messageId, t]);

    const onEmojiSelect = useCallback(
      async (emoji: TEmojiItem) => {
        const trpc = getTRPCClient();

        try {
          await trpc.messages.toggleReaction.mutate({
            messageId,
            emoji: emoji.shortcodes[0]
          });
        } catch (error) {
          toast.error(t('failedAddReaction'));

          console.error('Error adding reaction:', error);
        }
      },
      [messageId, t]
    );

    const onReplyClick = useCallback(() => {
      openThreadSidebar(messageId, channelId);
    }, [messageId, channelId]);

    const onPinClick = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        await trpc.messages.togglePin.mutate({ messageId });

        toast.success(t('messagePinToggled'));
      } catch (error) {
        toast.error(t('failedTogglePin'));

        console.error('Error toggling pin status:', error);
      }
    }, [messageId, t]);

    return (
      <div className="gap-1 absolute right-0 -top-6 z-10 hidden group-hover:flex [&:has([data-state=open])]:flex items-center space-x-1 rounded-lg shadow-lg border border-border p-2 transition-all bg-background">
        {onReply && (
          <IconButton
            size="sm"
            variant="ghost"
            icon={Reply}
            onClick={onReply}
            title={t('replyToMessage')}
          />
        )}
        {!isThreadReply && (
          <IconButton
            size="sm"
            variant="ghost"
            icon={MessageSquareText}
            onClick={onReplyClick}
            title={t('replyInThread')}
          />
        )}
        {canManage && (
          <>
            <IconButton
              size="sm"
              variant="ghost"
              icon={Pencil}
              onClick={onEdit}
              disabled={!editable}
              title={t('editMessage')}
            />

            <IconButton
              size="sm"
              variant="ghost"
              icon={isShiftHeld ? Trash2 : Trash}
              className={isShiftHeld ? 'text-destructive' : ''}
              onClick={onDeleteClick}
              title={t('deleteMessageTitle')}
            />
          </>
        )}
        {!disablePin && (
          <Protect permission={Permission.PIN_MESSAGES}>
            <IconButton
              size="sm"
              variant="ghost"
              icon={isPinned ? PinOff : Pin}
              onClick={onPinClick}
              title={isPinned ? t('unpinMessage') : t('pinMessage')}
            />
          </Protect>
        )}

        <Protect permission={Permission.REACT_TO_MESSAGES}>
          <div className="flex items-center space-x-0.5 border-l pl-1 gap-1">
            {recentEmojisToShow.map((emoji) => (
              <button
                key={emoji.name}
                type="button"
                onClick={() => onEmojiSelect(emoji)}
                className="w-6 h-6 flex items-center justify-center hover:bg-accent rounded-md transition-colors text-md"
                title={`:${emoji.shortcodes[0]}:`}
              >
                {emoji.emoji && !shouldUseFallbackImage(emoji) ? (
                  <span>{emoji.emoji}</span>
                ) : emoji.fallbackImage ? (
                  <img
                    src={emoji.fallbackImage}
                    alt={emoji.name}
                    className="w-5 h-5 object-contain"
                  />
                ) : null}
              </button>
            ))}

            <EmojiPicker onEmojiSelect={onEmojiSelect}>
              <IconButton
                variant="ghost"
                icon={Smile}
                title={t('addReaction')}
              />
            </EmojiPicker>
          </div>
        </Protect>
      </div>
    );
  }
);

export { MessageActions };
