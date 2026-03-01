import { setModViewOpen } from '@/features/app/actions';
import { useUserRoles } from '@/features/server/hooks';
import { useIsOwnUser, useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { getNickname, removeNickname, setNickname } from '@/helpers/nicknames';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  Permission,
  UserStatus
} from '@sharkord/shared';
import {
  Button,
  IconButton,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@sharkord/ui';
import { format } from 'date-fns';
import { Pencil, ShieldCheck, Trash, UserCog, X } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { Protect } from '../protect';
import { RoleBadge } from '../role-badge';
import { UserAvatar } from '../user-avatar';
import { UserStatusBadge } from '../user-status';

type TUserPopoverProps = {
  userId: number;
  children: React.ReactNode;
};

const UserPopover = memo(({ userId, children }: TUserPopoverProps) => {
  const user = useUserById(userId);
  const roles = useUserRoles(userId);
  const isOwnUser = useIsOwnUser(userId);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [, forceUpdate] = useState(0);

  const currentNickname = getNickname(userId);

  const handleStartEditing = useCallback(() => {
    setNicknameInput(currentNickname ?? '');
    setIsEditingNickname(true);
  }, [currentNickname]);

  const handleSaveNickname = useCallback(() => {
    const trimmed = nicknameInput.trim();
    if (trimmed) {
      setNickname(userId, trimmed);
    } else {
      removeNickname(userId);
    }
    setIsEditingNickname(false);
    forceUpdate((n) => n + 1);
  }, [nicknameInput, userId]);

  const handleRemoveNickname = useCallback(() => {
    removeNickname(userId);
    setIsEditingNickname(false);
    setNicknameInput('');
    forceUpdate((n) => n + 1);
  }, [userId]);

  const handleCancelEditing = useCallback(() => {
    setIsEditingNickname(false);
  }, []);

  if (!user) return <>{children}</>;

  const isDeleted = user.name === DELETED_USER_IDENTITY_AND_NAME;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="right">
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
                backgroundImage: `url("${getFileUrl(user.banner)}")`
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
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-semibold text-foreground truncate">
                {getRenderedUsername(user, user.id)}
              </span>
              {!isOwnUser && !isDeleted && !isEditingNickname && (
                <IconButton
                  icon={Pencil}
                  variant="ghost"
                  size="xs"
                  title="Set Nickname"
                  onClick={handleStartEditing}
                />
              )}
            </div>
            {currentNickname && !isEditingNickname && (
              <span className="text-xs text-muted-foreground">
                {user.name}
              </span>
            )}
            {isEditingNickname && (
              <div className="flex flex-col gap-1.5 py-1.5">
                <div className="flex items-center gap-1.5">
                  <Input
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    placeholder="Enter nickname..."
                    className="h-7 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNickname();
                      if (e.key === 'Escape') handleCancelEditing();
                    }}
                  />
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 px-2 text-xs shrink-0"
                    onClick={handleSaveNickname}
                  >
                    Save
                  </Button>
                  <IconButton
                    icon={X}
                    variant="ghost"
                    size="xs"
                    title="Cancel"
                    onClick={handleCancelEditing}
                  />
                </div>
                {currentNickname && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors text-left"
                    onClick={handleRemoveNickname}
                  >
                    Remove nickname
                  </button>
                )}
              </div>
            )}
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

UserPopover.displayName = 'UserPopover';

export { UserPopover };
