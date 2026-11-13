import { Dialog } from '@/components/dialogs/dialogs';
import type { TRequestImageCrop } from '@/helpers/crop-image';
import type { TDeviceSettings } from '@/types';
import type { TGenericObject } from '@sharkord/shared';
import { store } from '../store';
import { dialogInfoSelector } from './selectors';
import { dialogSliceActions } from './slice';

export const openDialog = (dialog: Dialog, props?: TGenericObject) => {
  store.dispatch(dialogSliceActions.openDialog({ dialog, props }));
};

export const toggleDialog = (dialog: Dialog) => {
  const { openDialog: current, isOpen } = dialogInfoSelector(store.getState());

  if (isOpen && current === dialog) {
    closeDialogs();

    return;
  }

  openDialog(dialog);
};

export const closeDialogs = () => {
  store.dispatch(dialogSliceActions.setClosing(true));

  // allow fade out animation to complete before stopping rendering, otherwise it looks choppy
  setTimeout(() => {
    const { closing } = dialogInfoSelector(store.getState());

    // a dialog opened during the fade out cancels the close, it must not be torn down with
    // the one that was leaving
    if (!closing) return;

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
  warning,
  warningUserIds,
  confirmLabel,
  cancelLabel,
  type = 'text',
  allowEmpty = false,
  autoClose = true
}: {
  title?: string;
  message?: string;
  warning?: string;
  warningUserIds?: number[];
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
      warning,
      warningUserIds,
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

export const requestScreenShareOptions = async ({
  settings
}: {
  settings: TDeviceSettings;
}): Promise<TDeviceSettings | null> => {
  return new Promise((resolve) => {
    openDialog(Dialog.SCREEN_SHARE_OPTIONS, {
      settings,
      onConfirm: (chosen: TDeviceSettings) => {
        closeDialogs();
        resolve(chosen);
      },
      onCancel: () => {
        closeDialogs();
        resolve(null);
      }
    });
  });
};

export const requestImageCrop: TRequestImageCrop = ({
  file,
  shape,
  aspect
}) => {
  return new Promise((resolve) => {
    openDialog(Dialog.IMAGE_CROP, {
      file,
      shape,
      aspect,
      onConfirm: (cropped: File) => {
        closeDialogs();
        resolve(cropped);
      },
      onCancel: () => {
        closeDialogs();
        resolve(null);
      }
    });
  });
};
