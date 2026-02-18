import { requestConfirmation } from '@/features/dialogs/actions';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError, type TJoinedUser } from '@sharkord/shared';
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AutoFocus,
  Group,
  Switch
} from '@sharkord/ui';
import { AlertCircleIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TDeleteUserDialogProps = TDialogBaseProps & {
  user: TJoinedUser;
  refetch: () => Promise<void>;
  onDelete?: () => void;
};

const DeleteUserDialog = memo(
  ({ isOpen, close, user, refetch, onDelete }: TDeleteUserDialogProps) => {
    const [wipe, setWipe] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const onSubmit = useCallback(async () => {
      const choice = await requestConfirmation({
        title: `Delete ${user.name}?`,
        message: `Are you sure you want to delete this user ${wipe ? 'and all associated data' : ''}? This action cannot be undone.`,
        confirmLabel: 'Delete User',
        cancelLabel: 'Cancel'
      });

      if (!choice) {
        return;
      }

      const trpc = getTRPCClient();

      try {
        setIsDeleting(true);

        await trpc.users.delete.mutate({
          userId: user.id,
          wipe
        });

        toast.success('User deleted successfully');

        close();
        refetch();
        onDelete?.();
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to delete user'));
      } finally {
        setIsDeleting(false);
      }
    }, [close, refetch, wipe, user.name, user.id, onDelete]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {user.name}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex flex-col gap-4">
            <Group label="Wipe All Data">
              <Switch
                checked={wipe}
                onCheckedChange={(checked) => setWipe(checked)}
              />
            </Group>

            {wipe ? (
              <Alert variant="destructive" className="py-2">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This will permanently delete the user and all associated data,
                  including messages, emojis, reactions, and files. This
                  completely wipes the user from the server.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="info" className="py-2">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This will delete the user but keep their messages and data
                  intact. The user will be removed from the server, but their
                  messages, emojis, reactions, and files will remain as "Deleted
                  User".
                </AlertDescription>
              </Alert>
            )}
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={close}>Cancel</AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction onClick={onSubmit} disabled={isDeleting}>
                Delete User
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { DeleteUserDialog };
