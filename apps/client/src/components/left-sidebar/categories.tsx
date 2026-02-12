import { openDialog } from '@/features/dialogs/actions';
import {
  useCategories,
  useCategoryById
} from '@/features/server/categories/hooks';
import { useCan } from '@/features/server/hooks';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Permission } from '@sharkord/shared';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CategoryContextMenu } from '../context-menus/category';
import { Dialog } from '../dialogs/dialogs';
import { Protect } from '../protect';
import { IconButton } from '../ui/icon-button';
import { Channels } from './channels';

type TCategoryProps = {
  categoryId: number;
};

const Category = memo(({ categoryId }: TCategoryProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const category = useCategoryById(categoryId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: categoryId });

  const onCreateChannelClick = useCallback(() => {
    openDialog(Dialog.CREATE_CHANNEL, { categoryId });
  }, [categoryId]);

  if (!category) {
    return null;
  }

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform && { ...transform, x: 0 }),
        transition,
        opacity: isDragging ? 0.5 : 1
      }}
      className="mb-4"
    >
      <div className="mb-1 flex w-full items-center px-2 py-1 text-xs font-semibold text-muted-foreground">
        <div className="flex w-full items-center gap-1">
          <IconButton
            variant="ghost"
            size="sm"
            icon={ChevronIcon}
            onClick={() => setExpanded((v) => !v)}
            title={
              expanded
                ? t('sidebar.categories.collapse')
                : t('sidebar.categories.expand')
            }
          />
          <CategoryContextMenu categoryId={category.id}>
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing"
            >
              {category.name}
            </span>
          </CategoryContextMenu>
        </div>

        <Protect permission={Permission.MANAGE_CHANNELS}>
          <IconButton
            variant="ghost"
            size="sm"
            icon={Plus}
            onClick={onCreateChannelClick}
            title={t('sidebar.categories.createChannel')}
          />
        </Protect>
      </div>

      {expanded && <Channels categoryId={category.id} />}
    </div>
  );
});

const Categories = memo(() => {
  const { t } = useTranslation();
  const can = useCan();
  const categories = useCategories();
  const categoryIds = useMemo(
    () => categories.map((cat) => cat.id),
    [categories]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = categoryIds.indexOf(active.id as number);
      const newIndex = categoryIds.indexOf(over.id as number);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reorderedIds = [...categoryIds];
      const [movedId] = reorderedIds.splice(oldIndex, 1);

      reorderedIds.splice(newIndex, 0, movedId);

      try {
        const trpc = getTRPCClient();

        await trpc.categories.reorder.mutate({ categoryIds: reorderedIds });
      } catch (error) {
        toast.error(getTrpcError(error, t('toasts.categories.reorderFailed')));
      }
    },
    [categoryIds, t]
  );

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categoryIds}
          strategy={verticalListSortingStrategy}
          disabled={!can(Permission.MANAGE_CATEGORIES)}
        >
          {categories.map((category) => (
            <Category key={category.id} categoryId={category.id} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
});

export { Categories };
