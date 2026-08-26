import { UserAvatar } from '@/components/user-avatar';
import { useImageManager } from '@/hooks/use-image-manager';
import type { TJoinedPublicUser } from '@sharkord/shared';
import { Button, Group } from '@sharkord/ui';
import { Upload } from 'lucide-react';
import { memo } from 'react';

type TAvatarManagerProps = {
  user: TJoinedPublicUser;
};

const AvatarManager = memo(({ user }: TAvatarManagerProps) => {
  const { onPick, onRemove } = useImageManager('avatar');

  return (
    <Group label="Avatar">
      <div className="space-y-2">
        <div
          className="relative group cursor-pointer w-32 h-32"
          onClick={onPick}
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
          <Button size="sm" variant="outline" onClick={onRemove}>
            Remove avatar
          </Button>
        </div>
      )}
    </Group>
  );
});

export { AvatarManager };
