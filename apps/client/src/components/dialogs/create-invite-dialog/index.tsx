import { DatePicker } from '@/components/date-picker';
import { useRoles } from '@/features/server/roles/hooks';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import { getRandomString } from '@sharkord/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Group,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TCreateInviteDialogProps = TDialogBaseProps & {
  refetch: () => void;
};

const CreateInviteDialog = memo(
  ({ refetch, close, isOpen }: TCreateInviteDialogProps) => {
    const roles = useRoles();
    const { r, rrn, values, setTrpcErrors, onChange } = useForm({
      maxUses: 0,
      expiresAt: 0,
      code: getRandomString(24),
      roleId: 0
    });

    const handleCreate = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const payload: Record<string, unknown> = { ...values };

        // Only send roleId if a role was selected (not "None")
        if (!payload.roleId) {
          delete payload.roleId;
        }

        await trpc.invites.add.mutate(payload);
        toast.success('Invite created');

        refetch();
        close();
      } catch (error) {
        setTrpcErrors(error);
      }
    }, [close, refetch, setTrpcErrors, values]);

    return (
      <Dialog open={isOpen}>
        <DialogContent onInteractOutside={close} close={close}>
          <DialogHeader>
            <DialogTitle>Create Server Invite</DialogTitle>
            <DialogDescription>
              Create a new invitation link for users to join the server.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Group label="Code">
              <Input placeholder="Invite code" {...r('code')} />
            </Group>
            <Group label="Max uses" description="Use 0 for unlimited uses.">
              <Input placeholder="Max uses" {...r('maxUses', 'number')} />
            </Group>
            <Group
              label="Expires in"
              description="Leave empty for no expiration."
            >
              <DatePicker {...rrn('expiresAt')} minDate={Date.now()} />
            </Group>
            <Group
              label="Assign Role"
              description="Users joining with this invite will be assigned this role."
            >
              <Select
                onValueChange={(value) => onChange('roleId', Number(value))}
                value={values.roleId.toString()}
              >
                <SelectTrigger className="w-[230px]">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None (Default only)</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      <span style={{ color: role.color }}>{role.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Group>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateInviteDialog };
