import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/user-avatar';
import { setModViewOpen } from '@/features/app/actions';
import { useUserRoles } from '@/features/server/hooks';
import { useOwnUserId, useUserStatus } from '@/features/server/users/hooks';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { UserStatus, type TJoinedUser } from '@sharkord/shared';
import { format, formatDistanceToNow } from 'date-fns';
import { MoreVertical, Trash2, UserCog } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';

type TTableUserProps = {
  user: TJoinedUser;
  onUserDeleted?: () => void;
};

const TableUser = memo(({ user, onUserDeleted }: TTableUserProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteMessages, setDeleteMessages] = useState(false);
  const [deleteEmojisReactions, setDeleteEmojisReactions] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeletedPlaceholder = user.name === 'Deleted';

  const roles = useUserRoles(user.id);
  const status = useUserStatus(user.id);
  const ownUserId = useOwnUserId();

  const onModerateClick = useCallback(() => {
    setModViewOpen(true, user.id);
  }, [user.id]);

  const onDeleteUser = useCallback(() => {
    setDeleteMessages(isDeletedPlaceholder);
    setDeleteEmojisReactions(isDeletedPlaceholder);
    setDeleteFiles(isDeletedPlaceholder);
    setIsDeleteDialogOpen(true);
  }, [isDeletedPlaceholder]);

  const onDeleteMessagesChange = useCallback(
    (checked: boolean) => {
      setDeleteMessages(checked);

      if (checked) {
        setDeleteFiles(true);
      }
    },
    [setDeleteMessages, setDeleteFiles]
  );

  const onConfirmDeleteUser = useCallback(async () => {
    const trpc = getTRPCClient();
    setIsDeleting(true);

    try {
      await trpc.users.delete.mutate({
        userId: user.id,
        keepMessages: !deleteMessages,
        keepEmojisReactions: !deleteEmojisReactions,
        keepFiles: !deleteFiles
      });

      toast.success('User deleted successfully');
      onUserDeleted?.();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to delete user'));
    } finally {
      setIsDeleting(false);
    }
  }, [
    deleteEmojisReactions,
    deleteFiles,
    deleteMessages,
    onUserDeleted,
    user.id
  ]);

  return (
    <>
      <div
        key={user.id}
        className="grid grid-cols-[60px_1fr_120px_120px_120px_80px_50px] gap-4 px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
      >
      <div className="flex items-center justify-center">
        <UserAvatar
          userId={user.id}
          className="h-8 w-8 flex-shrink-0"
          showUserPopover
        />
      </div>

      <div className="flex items-center min-w-0">
        <div className="min-w-0">
          <div className="font-medium text-foreground truncate">
            {user.name}
          </div>
          {user.bio && (
            <div className="text-xs text-muted-foreground truncate">
              {user.bio}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center min-w-0 gap-2">
        <span
          className="text-xs truncate text-muted-foreground"
          title={roles.map((role) => role.name).join(', ')}
        >
          {roles.map((role) => role.name).join(', ')}
        </span>
      </div>

      <div className="flex items-center text-muted-foreground">
        <span className="text-xs" title={format(user.createdAt, 'PPP p')}>
          {formatDistanceToNow(user.createdAt, { addSuffix: true })}
        </span>
      </div>

      <div className="flex items-center text-muted-foreground">
        <span className="text-xs">
          {formatDistanceToNow(user.lastLoginAt, { addSuffix: true })}
        </span>
      </div>

      <div className="flex items-center text-muted-foreground">
        <span
          className={cn('capitalize text-xs', {
            'text-green-500': status === UserStatus.ONLINE,
            'text-yellow-500': status === UserStatus.IDLE
          })}
        >
          {status}
        </span>
      </div>

      <div className="flex items-center justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onModerateClick}>
              <UserCog className="h-4 w-4" />
              Moderate User
            </DropdownMenuItem>
            {ownUserId !== user.id && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDeleteUser}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete User
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={deleteMessages}
              onChange={(event) => onDeleteMessagesChange(event.target.checked)}
              disabled={isDeleting || isDeletedPlaceholder}
              className="h-4 w-4"
            />
            Delete also this user's messages
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground pl-6">
            <input
              type="checkbox"
              checked={deleteFiles}
              onChange={(event) => setDeleteFiles(event.target.checked)}
              disabled={isDeleting || isDeletedPlaceholder || deleteMessages}
              className="h-4 w-4"
            />
            Delete files from this user's messages
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={deleteEmojisReactions}
              onChange={(event) =>
                setDeleteEmojisReactions(event.target.checked)
              }
              disabled={isDeleting || isDeletedPlaceholder}
              className="h-4 w-4"
            />
            Delete also this user's emojis and reactions
          </label>

          {deleteMessages && (
            <p className="text-xs text-muted-foreground pl-6">
              Files are automatically deleted when deleting messages.
            </p>
          )}

          <AlertDialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmDeleteUser}
              disabled={isDeleting}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

export { TableUser };
