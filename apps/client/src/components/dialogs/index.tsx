import { closeDialogs } from '@/features/dialogs/actions';
import { useDialogInfo } from '@/features/dialogs/hooks';
import { createElement, memo } from 'react';
import { AssignRoleDialog } from './assign-role';
import { ConfirmActionDialog } from './confirm-action';
import { CreateCategoryDialog } from './create-category';
import { CreateChannelDialog } from './create-channel';
import { CreateInviteDialog } from './create-invite-dialog';
import { DeleteUserDialog } from './delete-user';
import { Dialog } from './dialogs';
import { PluginInstallConfirmDialog } from './plugin-install-confirm';
import { SearchDialog } from './search';
import { ServerPasswordDialog } from './server-password';
import { SoundsDialog } from './sounds';
import { TextInputDialog } from './text-input';
import { VoiceDebugDialog } from './voice-debug';
import { WelcomeProfileSetupDialog } from './welcome-profile-setup';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DialogsMap: any = {
  [Dialog.CONFIRM_ACTION]: ConfirmActionDialog,
  [Dialog.CREATE_CHANNEL]: CreateChannelDialog,
  [Dialog.TEXT_INPUT]: TextInputDialog,
  [Dialog.SERVER_PASSWORD]: ServerPasswordDialog,
  [Dialog.SOUNDS]: SoundsDialog,
  [Dialog.ASSIGN_ROLE]: AssignRoleDialog,
  [Dialog.CREATE_INVITE]: CreateInviteDialog,
  [Dialog.CREATE_CATEGORY]: CreateCategoryDialog,
  [Dialog.PLUGIN_INSTALL_CONFIRM]: PluginInstallConfirmDialog,
  [Dialog.DELETE_USER]: DeleteUserDialog,
  [Dialog.SEARCH]: SearchDialog,
  [Dialog.WELCOME_PROFILE_SETUP]: WelcomeProfileSetupDialog,
  [Dialog.VOICE_DEBUG]: VoiceDebugDialog
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
