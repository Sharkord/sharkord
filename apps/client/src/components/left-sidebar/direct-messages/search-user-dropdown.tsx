import { UserAvatar } from '@/components/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Input
} from '@sharkord/ui';
import { Plus } from 'lucide-react';
import { memo } from 'react';

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
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            variant="ghost"
            size="sm"
            icon={Plus}
            title="Create channel"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search user"
            />
          </div>
          {usersToStartDm.length === 0 && (
            <div className="px-2 pb-2 text-xs text-muted-foreground">
              No users available
            </div>
          )}
          {usersToStartDm.map((user) => (
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
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

export { SearchUserDropdown };
