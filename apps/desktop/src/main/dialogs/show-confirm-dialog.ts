import { dialog, type BrowserWindow, type MessageBoxOptions } from 'electron';

type TConfirmDialogOptions = {
  type: 'info' | 'question' | 'warning';
  message: string;
  detail: string;
  confirmLabel: string;
  cancelLabel: string;
  focusConfirm?: boolean;
};

// cancel on the left and confirm on the right, as in the client's own dialogs. macos draws
// the first button on the right, windows and linux draw them in the order given
const CONFIRM_ID = process.platform === 'darwin' ? 0 : 1;
const CANCEL_ID = 1 - CONFIRM_ID;

const showConfirmDialog = async (
  win: BrowserWindow | undefined,
  {
    type,
    message,
    detail,
    confirmLabel,
    cancelLabel,
    focusConfirm = false
  }: TConfirmDialogOptions
) => {
  const buttons = [];

  buttons[CONFIRM_ID] = confirmLabel;
  buttons[CANCEL_ID] = cancelLabel;

  const options: MessageBoxOptions = {
    type,
    buttons,
    cancelId: CANCEL_ID,
    defaultId: focusConfirm ? CONFIRM_ID : CANCEL_ID,
    message,
    detail,
    noLink: true
  };

  let response: number;

  if (win) {
    ({ response } = await dialog.showMessageBox(win, options));
  } else {
    ({ response } = await dialog.showMessageBox(options));
  }

  return response === CONFIRM_ID;
};

export { showConfirmDialog };
