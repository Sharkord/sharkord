import { closeDialogs } from '@/features/dialogs/actions';
import { useDialogInfo } from '@/features/dialogs/hooks';
import { createElement, memo } from 'react';
import { AssignRoleDialog } from './assign-role';
import ConfirmActionDialog from './confirm-action';
import { CreateCategoryDialog } from './create-category';
import { CreateChannelDialog } from './create-channel';
import { CreateInviteDialog } from './create-invite-dialog';
import { DeleteUserDialog } from './delete-user';
import { Dialog } from './dialogs';
import { PluginCommandsDialog } from './plugin-commands';
import { PluginLogsDialog } from './plugin-logs';
import { PluginSettingsDialog } from './plugin-settings';
import { ServerPasswordDialog } from './server-password';
import { TextInputDialog } from './text-input';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DialogsMap: any = {
  [Dialog.CONFIRM_ACTION]: ConfirmActionDialog,
  [Dialog.CREATE_CHANNEL]: CreateChannelDialog,
  [Dialog.TEXT_INPUT]: TextInputDialog,
  [Dialog.SERVER_PASSWORD]: ServerPasswordDialog,
  [Dialog.ASSIGN_ROLE]: AssignRoleDialog,
  [Dialog.CREATE_INVITE]: CreateInviteDialog,
  [Dialog.CREATE_CATEGORY]: CreateCategoryDialog,
  [Dialog.PLUGIN_LOGS]: PluginLogsDialog,
  [Dialog.PLUGIN_COMMANDS]: PluginCommandsDialog,
  [Dialog.PLUGIN_SETTINGS]: PluginSettingsDialog,
  [Dialog.DELETE_USER]: DeleteUserDialog
};

const DialogsProvider = memo(() => {
  const { isOpen, openDialog, props, closing } = useDialogInfo();

  if (!openDialog || !DialogsMap[openDialog]) return null;

  const realIsOpen = isOpen && !closing;

  return createElement(DialogsMap[openDialog], {
    ...props,
    isOpen: realIsOpen,
    close: closeDialogs
  });
});

export { DialogsProvider };
