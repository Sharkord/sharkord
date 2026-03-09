import { UserAvatar } from '@/components/user-avatar';
import {
  AutoFocus,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Input
} from '@sharkord/ui';
import { Plus } from 'lucide-react';
import { memo, useMemo } from 'react';

const MAX_USERS = 100;

type TSearchUserDropdownProps = {
  query: string;
  setQuery: (query: string) => void;
  usersToStartDm: { id: number; name: string }[];
  onStartDm: (userId: number) => void;
};

const SearchUserDropdown = memo(
  ({
    query,
    setQuery,
    usersToStartDm,
    onStartDm
  }: TSearchUserDropdownProps) => {
    const { allUsers, extraUsers } = useMemo(() => {
      const filtered = usersToStartDm.filter((user) =>
        user.name.toLowerCase().includes(query.toLowerCase())
      );

      return {
        allUsers: filtered.slice(0, MAX_USERS),
        extraUsers: filtered.length - MAX_USERS
      };
    }, [usersToStartDm, query]);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            variant="ghost"
            size="sm"
            icon={Plus}
            title="Start new conversation"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 max-h-80 overflow-auto"
        >
          <div className="p-2">
            <AutoFocus>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search user"
              />
            </AutoFocus>
          </div>
          {allUsers.length === 0 && (
            <div className="px-2 pb-2 text-xs text-muted-foreground">
              No users available
            </div>
          )}
          {allUsers.map((user) => (
            <DropdownMenuItem key={user.id} onClick={() => onStartDm(user.id)}>
              <div className="flex items-center gap-2">
                <UserAvatar
                  userId={user.id}
                  className="h-5 w-5"
                  showUserPopover
                />
                <span>{user.name}</span>
              </div>
            </DropdownMenuItem>
          ))}
          {extraUsers > 0 && (
            <div className="px-2 pb-2 text-xs text-muted-foreground">
              And {extraUsers} more...
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

export { SearchUserDropdown };
