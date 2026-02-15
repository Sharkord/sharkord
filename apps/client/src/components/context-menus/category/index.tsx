import { ServerScreen } from '@/components/server-screens/screens';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu';
import { requestConfirmation } from '@/features/dialogs/actions';
import { openServerScreen } from '@/features/server-screens/actions';
import { useCategoryById } from '@/features/server/categories/hooks';
import { useCan } from '@/features/server/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { Permission } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';

type TCategoryContextMenuProps = {
  children: React.ReactNode;
  categoryId: number;
};

const CategoryContextMenu = memo(
  ({ children, categoryId }: TCategoryContextMenuProps) => {
    const can = useCan();
    const category = useCategoryById(categoryId);
    
    const onDeleteClick = useCallback(async () => {
      const choice = await requestConfirmation({
        title: 'Delete Category',
        message:
          'Are you sure you want to delete this category? This WILL delete all the channels within this category. This action cannot be undone.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel'
      });

      if (!choice) return;

      const trpc = getTRPCClient();

      try {
        await trpc.categories.delete.mutate({ categoryId });
        toast.success('Category deleted');
      } catch {
        toast.error('Failed to delete category');
      }
    }, [categoryId]);

    const onEditClick = useCallback(() => {
      openServerScreen(ServerScreen.CATEGORY_SETTINGS, { categoryId });
    }, [categoryId]);

    if (!can(Permission.MANAGE_CATEGORIES)) {
      return <>{children}</>;
    }

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>{category?.name}</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onEditClick}>Edit</ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={onDeleteClick}>
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }
);

export { CategoryContextMenu };
