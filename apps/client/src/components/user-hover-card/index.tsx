import { setModViewOpen } from '@/features/app/actions';
import { useUserRoles } from '@/features/server/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  Permission,
  UserStatus
} from '@sharkord/shared';
import { format } from 'date-fns';
import { ShieldCheck, Trash, UserCog } from 'lucide-react';
import { memo, useCallback, useRef, useState } from 'react';
import { Protect } from '../protect';
import { RoleBadge } from '../role-badge';
import { IconButton } from '../ui/icon-button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { UserAvatar } from '../user-avatar';
import { UserStatusBadge } from '../user-status';

const OPEN_DELAY_MS = 400;
const CLOSE_DELAY_MS = 300;

type TUserHoverCardProps = {
  userId: number;
  children: React.ReactNode;
};

const UserHoverCard = memo(({ userId, children }: TUserHoverCardProps) => {
  const [open, setOpen] = useState(false);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeouts = useCallback(() => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimeouts();
    closeTimeoutRef.current = null;
    openTimeoutRef.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  }, [clearTimeouts]);

  const handleMouseLeave = useCallback(() => {
    clearTimeouts();
    openTimeoutRef.current = null;
    closeTimeoutRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [clearTimeouts]);

  const user = useUserById(userId);
  const roles = useUserRoles(userId);

  if (!user) return <>{children}</>;

  const isDeleted = user.name === DELETED_USER_IDENTITY_AND_NAME;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="inline"
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        side="right"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative">
          {user.banned && (
            <div className="absolute right-2 top-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Banned
            </div>
          )}
          {isDeleted && (
            <div className="absolute right-2 top-2 bg-gray-600 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
              <Trash className="h-3 w-3" />
              Deleted
            </div>
          )}
          {user.banner ? (
            <div
              className="h-24 w-full rounded-t-md bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${getFileUrl(user.banner)})`
              }}
            />
          ) : (
            <div
              className="h-24 w-full rounded-t-md"
              style={{
                background: user.bannerColor || '#5865f2'
              }}
            />
          )}
          <div className="absolute left-4 top-16">
            <UserAvatar
              userId={user.id}
              className="h-16 w-16 border-4 border-card"
              showStatusBadge={false}
            />
          </div>
        </div>

        <div className="px-4 pt-12 pb-4">
          <div className="mb-3">
            <span className="text-lg font-semibold text-foreground truncate mb-1">
              {getRenderedUsername(user)}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <UserStatusBadge
                  status={user.status || UserStatus.OFFLINE}
                  className="h-3 w-3"
                />
                <span className="text-xs text-muted-foreground capitalize">
                  {user.status || UserStatus.OFFLINE}
                </span>
              </div>
            </div>
          </div>

          {roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {roles.map((role) => (
                <RoleBadge key={role.id} role={role} />
              ))}
            </div>
          )}

          {user.bio && (
            <div className="mt-3">
              <p className="text-sm text-foreground leading-relaxed">
                {user.bio}
              </p>
            </div>
          )}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Member since {format(new Date(user.createdAt), 'PP')}
            </p>

            <Protect permission={Permission.MANAGE_USERS}>
              <IconButton
                icon={UserCog}
                variant="ghost"
                size="sm"
                title="Moderation View"
                onClick={() => setModViewOpen(true, user.id)}
              />
            </Protect>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

UserHoverCard.displayName = 'UserHoverCard';

export { UserHoverCard };
