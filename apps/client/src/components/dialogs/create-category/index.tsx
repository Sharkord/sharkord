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
import type { TDialogBaseProps } from '../types';

type TCreateCategoryDialogProps = TDialogBaseProps;

const CreateCategoryDialog = memo(
  ({ isOpen, close }: TCreateCategoryDialogProps) => {
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
            <DialogTitle>Create New Category</DialogTitle>
          </DialogHeader>

          <Group label="Category name">
            <AutoFocus>
              <Input
                {...r('name')}
                placeholder="Category name"
                onEnter={onSubmit}
              />
            </AutoFocus>
          </Group>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={loading}>
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateCategoryDialog };
