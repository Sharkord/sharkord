import { TiptapInput } from '@/components/tiptap-input';
import { AutoFocus } from '@/components/ui/auto-focus';
import { getTRPCClient } from '@/lib/trpc';
import type { TMessage } from '@sharkord/shared';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TMessageEditInlineProps = {
  message: TMessage;
  onBlur: () => void;
};

const MessageEditInline = memo(
  ({ message, onBlur }: TMessageEditInlineProps) => {
    const { t } = useTranslation();
    const [value, setValue] = useState<string>(message.content ?? '');

    const onSubmit = useCallback(
      async (newValue: string | undefined) => {
        if (!newValue) {
          onBlur();
          return;
        }

        const trpc = getTRPCClient();

        try {
          await trpc.messages.edit.mutate({
            messageId: message.id,
            content: newValue
          });
          toast.success(t('toasts.messages.edited'));
        } catch {
          toast.error(t('toasts.messages.editFailed'));
        } finally {
          onBlur();
        }
      },
      [message.id, onBlur, t]
    );

    return (
      <div className="flex flex-col gap-2">
        <AutoFocus>
          <TiptapInput
            value={value}
            onChange={setValue}
            onSubmit={() => onSubmit(value)}
            onCancel={onBlur}
          />
        </AutoFocus>
        <span className="text-xs text-primary/60">
          Press Enter to save, Esc to cancel
        </span>
      </div>
    );
  }
);

export { MessageEditInline };
