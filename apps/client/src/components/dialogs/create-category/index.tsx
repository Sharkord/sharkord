import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import {
  AutoFocus,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Group,
  Input
} from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TCreateCategoryDialogProps = TDialogBaseProps;

const CreateCategoryDialog = memo(
  ({ isOpen, close }: TCreateCategoryDialogProps) => {
    const { t } = useTranslation('dialogs');
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
            <DialogTitle>{t('createCategoryTitle')}</DialogTitle>
          </DialogHeader>

          <Group label={t('categoryNameLabel')}>
            <AutoFocus>
              <Input
                {...r('name')}
                placeholder={t('categoryNamePlaceholder')}
                onEnter={onSubmit}
              />
            </AutoFocus>
          </Group>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={close}>
              {t('cancel')}
            </Button>
            <Button onClick={onSubmit} disabled={loading}>
              {t('createCategoryBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateCategoryDialog };
