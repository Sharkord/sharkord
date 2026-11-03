import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AutoFocus,
  Input
} from '@sharkord/ui';
import { AlertCircleIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';
import { WarningUser } from './warning-user';

type TTextInputDialogProps = TDialogBaseProps & {
  onCancel?: () => void;
  onConfirm?: (text: string | undefined) => void;
  title?: string;
  message?: string;
  warning?: string;
  warningUserIds?: number[];
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
    warning,
    warningUserIds,
    confirmLabel,
    cancelLabel,
    allowEmpty,
    type
  }: TTextInputDialogProps) => {
    const { t } = useTranslation('dialogs');
    const [value, setValue] = useState<string | undefined>(undefined);

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
          {warning && (
            <Alert variant="warning" className="py-2">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {warning}
                {warningUserIds?.map((userId) => (
                  <WarningUser key={userId} userId={userId} />
                ))}
              </AlertDescription>
            </Alert>
          )}
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
              {cancelLabel ?? t('cancel')}
            </AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction
                onClick={onSubmit}
                disabled={!allowEmpty && !value}
              >
                {confirmLabel ?? t('confirm')}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { TextInputDialog };
