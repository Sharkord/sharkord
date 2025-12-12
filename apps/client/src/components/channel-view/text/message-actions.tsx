import { EmojiPicker } from '@/components/emoji-picker';
import { Protect } from '@/components/protect';
import type { TEmojiItem } from '@/components/tiptap-input/types';
import { IconButton } from '@/components/ui/icon-button';
import { requestConfirmation } from '@/features/dialogs/actions';
import { getTRPCClient } from '@/lib/trpc';
import { Permission } from '@sharkord/shared';
import { Pencil, Smile, Trash } from 'lucide-react';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';

type TMessageActionsProps = {
  messageId: number;
  onEdit: () => void;
  canManage: boolean;
};

const MessageActions = memo(
  ({ onEdit, messageId, canManage }: TMessageActionsProps) => {
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
      <div className="gap-2 absolute right-0 -top-6 z-10 hidden group-hover:flex [&:has([data-state=open])]:flex items-center space-x-1 rounded-lg shadow-lg border border-border p-1 transition-all h-8">
        {canManage && (
          <>
            <IconButton
              size="sm"
              variant="ghost"
              icon={Pencil}
              onClick={onEdit}
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
          <EmojiPicker onEmojiSelect={onEmojiSelect}>
            <IconButton
              size="sm"
              variant="ghost"
              icon={Smile}
              title="Add Reaction"
            />
          </EmojiPicker>
        </Protect>
      </div>
    );
  }
);

export { MessageActions };
