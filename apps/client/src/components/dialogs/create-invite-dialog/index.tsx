import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Group } from '@/components/ui/group';
import { Input } from '@/components/ui/input';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import { getRandomString } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TCreateInviteDialogProps = TDialogBaseProps & {
  refetch: () => void;
};

const CreateInviteDialog = memo(
  ({ refetch, close, isOpen }: TCreateInviteDialogProps) => {
    const { t } = useTranslation();
    const { r, rrn, values, setTrpcErrors } = useForm({
      maxUses: 0,
      expiresAt: 0,
      code: getRandomString(24)
    });

    const handleCreate = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        await trpc.invites.add.mutate(values);
        toast.success(t('dialogs.createInvite.toasts.created'));

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
            <DialogTitle>{t('dialogs.createInvite.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.createInvite.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Group label={t('dialogs.createInvite.codeLabel')}>
              <Input placeholder={t('dialogs.createInvite.codePlaceholder')} {...r('code')} />
            </Group>
            <Group
              label={t('dialogs.createInvite.maxUsesLabel')}
              description={t('dialogs.createInvite.maxUsesDescription')}
            >
              <Input
                placeholder={t('dialogs.createInvite.maxUsesPlaceholder')}
                {...r('maxUses', 'number')}
              />
            </Group>
            <Group
              label={t('dialogs.createInvite.expiresInLabel')}
              description={t('dialogs.createInvite.expiresInDescription')}
            >
              <DatePicker {...rrn('expiresAt')} minDate={Date.now()} />
            </Group>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={close}>
              {t('dialogs.createInvite.cancel')}
            </Button>
            <Button onClick={handleCreate}>{t('dialogs.createInvite.createInvite')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateInviteDialog };
