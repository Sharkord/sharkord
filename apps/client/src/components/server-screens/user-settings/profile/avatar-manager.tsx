import { UserAvatar } from '@/components/user-avatar';
import { uploadFile } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError, type TJoinedPublicUser } from '@sharkord/shared';
import { Button, Group } from '@sharkord/ui';
import { Upload } from 'lucide-react';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';

type TAvatarManagerProps = {
  user: TJoinedPublicUser;
};

const AvatarManager = memo(({ user }: TAvatarManagerProps) => {
  const openFilePicker = useFilePicker();

  const removeAvatar = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.changeAvatar.mutate({ fileId: undefined });

      toast.success('Avatar removed successfully!');
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to remove avatar'));
    }
  }, []);

  const onAvatarClick = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      const [file] = await openFilePicker('image/*');

      const temporaryFile = await uploadFile(file);

      if (!temporaryFile) {
        toast.error('Could not upload file. Please try again.');
        return;
      }

      await trpc.users.changeAvatar.mutate({ fileId: temporaryFile.id });

      toast.success('Avatar updated successfully!');
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to update avatar'));
    }
  }, [openFilePicker]);

  return (
    <Group label="Avatar">
      <div className="space-y-2">
        <div
          className="relative group cursor-pointer w-32 h-32"
          onClick={onAvatarClick}
        >
          <UserAvatar
            userId={user.id}
            className="h-32 w-32 rounded-full bg-muted transition-opacity group-hover:opacity-30"
            showStatusBadge={false}
            showUserPopover={false}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <div className="bg-black/50 rounded-full p-3">
              <Upload className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>
      {user.avatarId && (
        <div>
          <Button size="sm" variant="outline" onClick={removeAvatar}>
            Remove avatar
          </Button>
        </div>
      )}
    </Group>
  );
});

export { AvatarManager };
