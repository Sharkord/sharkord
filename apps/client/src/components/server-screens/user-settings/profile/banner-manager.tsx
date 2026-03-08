import { getFileUrl } from '@/helpers/get-file-url';
import { uploadFile } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { TJoinedPublicUser } from '@sharkord/shared';
import { Button, buttonVariants, Group } from '@sharkord/ui';
import { Upload } from 'lucide-react';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';

type TBannerManagerProps = {
  user: TJoinedPublicUser;
};

const BannerManager = memo(({ user }: TBannerManagerProps) => {
  const openFilePicker = useFilePicker();

  const removeBanner = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.changeBanner.mutate({ fileId: undefined });

      toast.success('Banner removed successfully!');
    } catch {
      toast.error('Could not remove banner. Please try again.');
    }
  }, []);

  const onBannerClick = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      const [file] = await openFilePicker('image/*');

      const temporaryFile = await uploadFile(file);

      if (!temporaryFile) {
        toast.error('Could not upload file. Please try again.');
        return;
      }

      await trpc.users.changeBanner.mutate({ fileId: temporaryFile.id });

      toast.success('Banner updated successfully!');
    } catch {
      toast.error('Could not update banner. Please try again.');
    }
  }, [openFilePicker]);

  return (
    <Group label="Banner">
      <div className="space-y-2">
        <div
          className="relative group cursor-pointer w-80 h-24"
          onClick={onBannerClick}
        >
          {user.banner ? (
            <img
              src={getFileUrl(user.banner)}
              alt="User Banner"
              className="w-80 h-24 object-cover rounded-md transition-opacity group-hover:opacity-70"
            />
          ) : (
            <div
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'w-80 h-24 cursor-pointer transition-opacity group-hover:opacity-70'
              )}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
            <div className="bg-black/50 rounded-full p-3">
              <Upload className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>
      {user.bannerId && (
        <div>
          <Button size="sm" variant="outline" onClick={removeBanner}>
            Remove banner
          </Button>
        </div>
      )}
    </Group>
  );
});

export { BannerManager };
