import { getFileUrl } from '@/helpers/get-file-url';
import { useImageManager } from '@/hooks/use-image-manager';
import { cn } from '@/lib/utils';
import type { TJoinedPublicUser } from '@sharkord/shared';
import { Button, buttonVariants, Group } from '@sharkord/ui';
import { Upload } from 'lucide-react';
import { memo } from 'react';

type TBannerManagerProps = {
  user: TJoinedPublicUser;
};

const BannerManager = memo(({ user }: TBannerManagerProps) => {
  const { onPick, onRemove } = useImageManager('banner');

  return (
    <Group label="Banner">
      <div className="space-y-2">
        <div
          className="relative group cursor-pointer w-80 h-32"
          onClick={onPick}
        >
          {user.banner ? (
            <img
              src={getFileUrl(user.banner)}
              alt="User Banner"
              className="w-80 h-32 object-cover rounded-md transition-opacity group-hover:opacity-70"
            />
          ) : (
            <div
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'w-80 h-32 cursor-pointer transition-opacity group-hover:opacity-70'
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
          <Button size="sm" variant="outline" onClick={onRemove}>
            Remove banner
          </Button>
        </div>
      )}
    </Group>
  );
});

export { BannerManager };
