import { Dialog } from '@/components/dialogs/dialogs';
import type { TGenericObject } from '@sharkord/shared';
import { store } from '../store';
import { dialogSliceActions } from './slice';

export const openDialog = (dialog: Dialog, props?: TGenericObject) => {
  store.dispatch(dialogSliceActions.openDialog({ dialog, props }));
};

export const closeDialogs = () => {
  store.dispatch(dialogSliceActions.setClosing(true));

  // allow fade out animation to complete before stopping rendering, otherwise it looks choppy
  setTimeout(() => {
    store.dispatch(dialogSliceActions.closeDialogs());

    setTimeout(() => {
      // https://github.com/radix-ui/primitives/issues/1241
      // remove this after radix fixes the bug
      document.body.style.pointerEvents = '';
    }, 0);
  }, 150);
};

export const requestConfirmation = async ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'info',
  onConfirm,
  onCancel
}: {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info';
  onConfirm?: () => void;
  onCancel?: () => void;
}): Promise<boolean> => {
  return new Promise((resolve) => {
    openDialog(Dialog.CONFIRM_ACTION, {
      title,
      message,
      confirmLabel,
      cancelLabel,
      variant,
      onConfirm: () => {
        onConfirm?.();
        closeDialogs();
        resolve(true);
      },
      onCancel: () => {
        onCancel?.();
        closeDialogs();
        resolve(false);
      }
    });
  });
};

export const requestTextInput = async ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  type = 'text',
  allowEmpty = false,
  autoClose = true
}: {
  title?: string;
  message?: string;
  type?: 'text' | 'password';
  confirmLabel?: string;
  cancelLabel?: string;
  allowEmpty?: boolean;
  autoClose?: boolean;
}): Promise<string | undefined | null> => {
  return new Promise((resolve) => {
    openDialog(Dialog.TEXT_INPUT, {
      title,
      message,
      confirmLabel,
      cancelLabel,
      allowEmpty,
      type,
      onConfirm: (text: string) => {
        if (autoClose) {
          closeDialogs();
        }

        resolve(text);
      },
      onCancel: () => {
        resolve(null);
      }
    });
  });
};

export const resetDialogs = () => {
  store.dispatch(dialogSliceActions.resetDialogs());
};
