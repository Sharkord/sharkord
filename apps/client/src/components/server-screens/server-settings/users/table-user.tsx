import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/user-avatar';
import { setModViewOpen } from '@/features/app/actions';
import { useUserRoles } from '@/features/server/hooks';
import { useUserStatus } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import { UserStatus, type TJoinedUser } from '@sharkord/shared';
import { format, formatDistanceToNow } from 'date-fns';
import { MoreVertical, UserCog } from 'lucide-react';
import { memo, useCallback } from 'react';

const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');

  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
};

type TTableUserProps = {
  user: TJoinedUser;
};

const TableUser = memo(({ user }: TTableUserProps) => {
  const roles = useUserRoles(user.id);
  const status = useUserStatus(user.id);

  const onModerateClick = useCallback(() => {
    setModViewOpen(true, user.id);
  }, [user.id]);

  return (
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export { TableUser };
