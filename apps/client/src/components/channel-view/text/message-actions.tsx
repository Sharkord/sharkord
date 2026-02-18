import { EmojiPicker } from '@/components/emoji-picker';
import { useRecentEmojis } from '@/components/emoji-picker/use-recent-emojis';
import { Protect } from '@/components/protect';
import type { TEmojiItem } from '@/components/tiptap-input/types';
import { IconButton } from '@/components/ui/icon-button';
import { requestConfirmation } from '@/features/dialogs/actions';
import { getTRPCClient } from '@/lib/trpc';
import { Permission } from '@sharkord/shared';
import { Pencil, Smile, Trash } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

const MAX_QUICK_EMOJIS = 4;

type TMessageActionsProps = {
  messageId: number;
  onEdit: () => void;
  canManage: boolean;
  editable: boolean;
};

const MessageActions = memo(
  ({ onEdit, messageId, canManage, editable }: TMessageActionsProps) => {
    const { recentEmojis } = useRecentEmojis();
    const recentEmojisToShow = useMemo(
      () => recentEmojis.slice(0, MAX_QUICK_EMOJIS),
      [recentEmojis]
    );

    const onDeleteClick = useCallback(async () => {
      const choice = await requestConfirmation({
        title: 'Delete Message',
        message:
          'Are you sure you want to delete this message? This action is irreversible.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel'
      });

      if (!choice) return;

      const trpc = getTRPCClient();

      try {
        await trpc.messages.delete.mutate({ messageId });
        toast.success('Message deleted');
      } catch {
        toast.error('Failed to delete message');
      }
    }, [messageId]);

    const onEmojiSelect = useCallback(
      async (emoji: TEmojiItem) => {
        const trpc = getTRPCClient();

        try {
          await trpc.messages.toggleReaction.mutate({
            messageId,
            emoji: emoji.shortcodes[0]
          });
        } catch (error) {
          toast.error('Failed to add reaction');

          console.error('Error adding reaction:', error);
        }
      },
      [messageId]
    );

    return (
      <div className="gap-1 absolute right-0 -top-6 z-10 hidden group-hover:flex [&:has([data-state=open])]:flex items-center space-x-1 rounded-lg shadow-lg border border-border p-1 transition-all h-8 ">
        {canManage && (
          <>
            <IconButton
              size="sm"
              variant="ghost"
              icon={Pencil}
              onClick={onEdit}
              disabled={!editable}
              title="Edit Message"
            />

            <IconButton
              size="sm"
              variant="ghost"
              icon={Trash}
              onClick={onDeleteClick}
              title="Delete Message"
            />
          </>
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
                {emoji.emoji ? (
                  <span>{emoji.emoji}</span>
                ) : (
                  <img
                    src={emoji.fallbackImage}
                    alt={emoji.name}
                    className="w-5 h-5 object-contain"
                  />
                )}
              </button>
            ))}

            <EmojiPicker onEmojiSelect={onEmojiSelect}>
              <IconButton variant="ghost" icon={Smile} title="Add Reaction" />
            </EmojiPicker>
          </div>
        </Protect>
      </div>
    );
  }
);

export { MessageActions };
