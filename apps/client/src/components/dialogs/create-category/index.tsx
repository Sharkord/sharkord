import { AutoFocus } from '@/components/ui/auto-focus';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Group } from '@/components/ui/group';
import { Input } from '@/components/ui/input';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TCreateCategoryDialogProps = TDialogBaseProps;

const CreateCategoryDialog = memo(
  ({ isOpen, close }: TCreateCategoryDialogProps) => {
    const { t } = useTranslation();
    const { values, r, setTrpcErrors } = useForm({
      name: 'New Category'
    });
    const [loading, setLoading] = useState(false);

    const onSubmit = useCallback(async () => {
      const trpc = getTRPCClient();

      setLoading(true);

      try {
        await trpc.categories.add.mutate({
          name: values.name
        });

        close();
      } catch (error) {
        setTrpcErrors(error);
      } finally {
        setLoading(false);
      }
    }, [values.name, close, setTrpcErrors]);

    return (
      <Dialog open={isOpen}>
        <DialogContent onInteractOutside={close} close={close}>
          <DialogHeader>
            <DialogTitle>{t('dialogs.createCategory.title')}</DialogTitle>
          </DialogHeader>

          <Group label={t('dialogs.createCategory.categoryNameLabel')}>
            <AutoFocus>
              <Input
                {...r('name')}
                placeholder={t('dialogs.createCategory.categoryNamePlaceholder')}
                onEnter={onSubmit}
              />
            </AutoFocus>
          </Group>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={close}>
              {t('dialogs.createCategory.cancel')}
            </Button>
            <Button onClick={onSubmit} disabled={loading}>
              {t('dialogs.createCategory.createCategory')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateCategoryDialog };
