import { closeDialogs } from '@/features/dialogs/actions';
import { useDialogInfo } from '@/features/dialogs/hooks';
import { createElement, lazy, memo, Suspense } from 'react';
import { Dialog } from './dialogs';

const DialogsMap = {
  [Dialog.CONFIRM_ACTION]: lazy(() => import('./confirm-action')),
  [Dialog.CREATE_CHANNEL]: lazy(
    () =>
      import('./create-channel').then((m) => ({ default: m.CreateChannelDialog }))
  ),
  [Dialog.TEXT_INPUT]: lazy(
    () =>
      import('./text-input').then((m) => ({ default: m.TextInputDialog }))
  ),
  [Dialog.SERVER_PASSWORD]: lazy(
    () =>
      import('./server-password').then((m) => ({
        default: m.ServerPasswordDialog
      }))
  ),
  [Dialog.ASSIGN_ROLE]: lazy(
    () =>
      import('./assign-role').then((m) => ({ default: m.AssignRoleDialog }))
  ),
  [Dialog.CREATE_INVITE]: lazy(
    () =>
      import('./create-invite-dialog').then((m) => ({
        default: m.CreateInviteDialog
      }))
  ),
  [Dialog.CREATE_CATEGORY]: lazy(
    () =>
      import('./create-category').then((m) => ({
        default: m.CreateCategoryDialog
      }))
  ),
  [Dialog.DELETE_USER]: lazy(
    () =>
      import('./delete-user').then((m) => ({ default: m.DeleteUserDialog }))
  )
};

const DialogsProvider = memo(() => {
  const { isOpen, openDialog, props, closing } = useDialogInfo();

  if (!openDialog || !DialogsMap[openDialog]) return null;

  const realIsOpen = isOpen && !closing;

  return (
    <Suspense fallback={null}>
      {createElement(DialogsMap[openDialog], {
        ...props,
        isOpen: realIsOpen,
        close: closeDialogs
      })}
    </Suspense>
  );
});

export { DialogsProvider };
