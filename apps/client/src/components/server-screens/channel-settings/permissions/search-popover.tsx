import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/user-avatar';
import { useAdminRoles, useAdminUsers } from '@/features/server/admin/hooks';
import { Plus, Search } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import type { TChannelPermissionType } from './types';

type TSearchPopoverProps = {
  onSelect: (type: TChannelPermissionType, id: number) => void;
  ignoreUserIds?: number[];
  ignoreRoleIds?: number[];
};

const SearchPopover = memo(
  ({ onSelect, ignoreUserIds, ignoreRoleIds }: TSearchPopoverProps) => {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TChannelPermissionType>('role');
    const { users } = useAdminUsers();
    const { roles } = useAdminRoles();

    const filteredRoles = useMemo(
      () =>
        roles.filter(
          (role) =>
            role.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !ignoreRoleIds?.includes(role.id)
        ),
      [roles, searchQuery, ignoreRoleIds]
    );

    const filteredUsers = useMemo(
      () =>
        users.filter(
          (user) =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !ignoreUserIds?.includes(user.id)
        ),
      [users, searchQuery, ignoreUserIds]
    );

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost">
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TChannelPermissionType)}
          >
            <div className="p-3 pb-0">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <TabsList className="w-full rounded-none border-b bg-transparent p-0">
              <TabsTrigger value="role" className="rounded-none">
                Roles
              </TabsTrigger>
              <TabsTrigger value="user" className="rounded-none">
                Users
              </TabsTrigger>
            </TabsList>

            <TabsContent value="role" className="m-0 max-h-64 overflow-y-auto">
              {filteredRoles.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No roles found
                </div>
              ) : (
                <div className="p-2">
                  {filteredRoles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => onSelect('role', role.id)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span>{role.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="user" className="m-0 max-h-64 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="p-2">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => onSelect('user', user.id)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <UserAvatar userId={user.id} />
                      <span>{user.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    );
  }
);

export { SearchPopover };
