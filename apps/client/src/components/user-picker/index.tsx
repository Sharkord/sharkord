import { UserAvatar } from '@/components/user-avatar';
import { useUsers } from '@/features/server/users/hooks';
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
import { memo, useMemo, useState } from 'react';

const MAX_USERS = 100;

type TUserPickerProps = {
  onSelect: (userId: number) => void;
  selectedUserId: number | null;
  ignoreUserIds?: number[];
};

const UserPicker = memo(
  ({ onSelect, selectedUserId, ignoreUserIds = [] }: TUserPickerProps) => {
    const [query, setQuery] = useState('');
    const users = useUsers();

    const filteredUsers = useMemo(() => {
      const filteredResults = users.filter(
        (user) =>
          user.name.toLowerCase().includes(query.toLowerCase()) &&
          !ignoreUserIds.includes(user.id) &&
          user.id !== selectedUserId
      );

      return filteredResults.slice(0, MAX_USERS);
    }, [users, query, ignoreUserIds, selectedUserId]);

    const hasMoreUsers = users.length > MAX_USERS;

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
          {filteredUsers.length === 0 && (
            <div className="px-2 pb-2 text-xs text-muted-foreground">
              No users available
            </div>
          )}
          {filteredUsers.map((user) => (
            <DropdownMenuItem key={user.id} onClick={() => onSelect(user.id)}>
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
          {hasMoreUsers && (
            <div className="px-2 pb-2 text-xs text-muted-foreground">
              And {users.length - MAX_USERS} more...
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

export { UserPicker };
