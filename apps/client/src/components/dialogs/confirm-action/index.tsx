import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@sharkord/ui';
import { memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TConfirmActionDialogProps = TDialogBaseProps & {
  onCancel?: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
};

const ConfirmActionDialog = memo(
  ({
    isOpen,
    onCancel,
    onConfirm,
    title,
    message,
    confirmLabel,
    cancelLabel
  }: TConfirmActionDialogProps) => {
    const { t } = useTranslation('dialogs');
    const confirmRef = useRef<HTMLButtonElement>(null);

    // radix focuses cancel on open, and enter is meant to confirm. taking over its own focus
    // step leaves no moment where cancel holds the focus
    const handleOpenAutoFocus = useCallback((event: Event) => {
      event.preventDefault();
      confirmRef.current?.focus();
    }, []);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent onOpenAutoFocus={handleOpenAutoFocus}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {title ?? t('confirmActionTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {message ?? t('confirmActionMsg')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={onCancel}>
              {cancelLabel ?? t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction ref={confirmRef} onClick={onConfirm}>
              {confirmLabel ?? t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { ConfirmActionDialog };
