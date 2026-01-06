import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { AutoFocus } from '@/components/ui/auto-focus';
import { Input } from '@/components/ui/input';
import { memo, useCallback, useState } from 'react';
import type { TDialogBaseProps } from '../types';

type TTextInputDialogProps = TDialogBaseProps & {
  onCancel?: () => void;
  onConfirm?: (text: string | undefined) => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  allowEmpty?: boolean;
  isModalOpen: boolean;
  type?: 'text' | 'password';
};

const TextInputDialog = memo(
  ({
    isOpen,
    close,
    onCancel,
    onConfirm,
    title,
    message,
    confirmLabel,
    cancelLabel,
    allowEmpty,
    type
  }: TTextInputDialogProps) => {
    const [value, setValue] = useState<string | undefined>();

    const onSubmit = useCallback(() => {
      onConfirm?.(value);
    }, [onConfirm, value]);

    const onCancelClick = useCallback(() => {
      onCancel?.();
      close();
    }, [onCancel, close]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {message && (
              <AlertDialogDescription>{message}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AutoFocus>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onEnter={onSubmit}
              className="mt-2"
              type={type}
              autoFocus
            />
          </AutoFocus>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={onCancelClick}>
              {cancelLabel ?? 'Cancel'}
            </AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction
                onClick={onSubmit}
                disabled={!allowEmpty && !value}
              >
                {confirmLabel ?? 'Confirm'}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { TextInputDialog };
