import { TiptapInput } from '@/components/tiptap-input';
import { getTRPCClient } from '@/lib/trpc';
import {
  type TMessage,
  isEmptyMessage,
  prepareMessageHtml
} from '@sharkord/shared';
import { AutoFocus } from '@sharkord/ui';
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
        if (!newValue || isEmptyMessage(newValue)) {
          toast.error(t('messageCannotBeEmpty'));

          onBlur();

          return;
        }

        const trpc = getTRPCClient();

        try {
          await trpc.messages.edit.mutate({
            messageId: message.id,
            content: prepareMessageHtml(newValue)
          });

          toast.success(t('messageEdited'));
        } catch {
          toast.error(t('failedEditMessage'));
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
        <span className="text-xs text-primary/60">{t('pressEnterToSave')}</span>
      </div>
    );
  }
);

export { MessageEditInline };
