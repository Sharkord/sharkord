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
import { memo } from 'react';
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
    const { t } = useTranslation();

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {title ?? t('dialogs.confirmAction.defaultTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {message ?? t('dialogs.confirmAction.defaultMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={onCancel}>
              {cancelLabel ?? t('dialogs.confirmAction.cancel')}
            </AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction onClick={onConfirm}>
                {confirmLabel ?? t('dialogs.confirmAction.confirm')}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export default ConfirmActionDialog;
