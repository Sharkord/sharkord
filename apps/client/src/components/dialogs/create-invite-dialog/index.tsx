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
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TCreateInviteDialogProps = TDialogBaseProps & {
  refetch: () => void;
};

const CreateInviteDialog = memo(
  ({ refetch, close, isOpen }: TCreateInviteDialogProps) => {
    const { t } = useTranslation('dialogs');
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

        toast.success(t('inviteCreated'));

        refetch();
        close();
      } catch (error) {
        setTrpcErrors(error);
      }
    }, [close, refetch, setTrpcErrors, values, t]);

    return (
      <Dialog open={isOpen}>
        <DialogContent onInteractOutside={close} close={close}>
          <DialogHeader>
            <DialogTitle>{t('createInviteTitle')}</DialogTitle>
            <DialogDescription>{t('createInviteDesc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Group label={t('inviteCodeLabel')}>
              <Input placeholder={t('inviteCodePlaceholder')} {...r('code')} />
            </Group>
            <Group label={t('maxUsesLabel')} description={t('maxUsesDesc')}>
              <Input
                placeholder={t('maxUsesPlaceholder')}
                {...r('maxUses', 'number')}
              />
            </Group>
            <Group label={t('expiresInLabel')} description={t('expiresInDesc')}>
              <DatePicker {...rrn('expiresAt')} minDate={Date.now()} />
            </Group>
            <Group
              label={t('assignRoleLabel')}
              description={t('assignRoleDesc')}
            >
              <Select
                onValueChange={(value) => onChange('roleId', Number(value))}
                value={values.roleId.toString()}
              >
                <SelectTrigger className="w-[230px]">
                  <SelectValue placeholder={t('selectRolePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('roleDefault')}</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Group>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={close}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreate}>{t('createInviteBtn')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateInviteDialog };
