import { useCategoryById } from '@/features/server/categories/hooks';
import { useChannelById } from '@/features/server/channels/hooks';
import { useCan } from '@/features/server/hooks';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { Permission } from '@sharkord/shared';
import { Hash, Volume2 } from 'lucide-react';
import { memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChannelDragPreviewContext, categoryDndId } from './helpers';
import { useSidebarDnd } from './use-sidebar-dnd';

const OVERLAY_CLASSNAME =
  'flex items-center gap-2 rounded bg-accent px-2 text-accent-foreground shadow-lg cursor-grabbing';

type TChannelDragOverlayProps = {
  channelId: number;
};

const ChannelDragOverlay = memo(({ channelId }: TChannelDragOverlayProps) => {
  const channel = useChannelById(channelId);

  if (!channel) {
    return null;
  }

  const Icon = channel.type === 'TEXT' ? Hash : Volume2;

  return (
    <div className={`${OVERLAY_CLASSNAME} py-1.5 text-sm`}>
      <Icon className="h-4 w-4" />
      <span className="truncate">{channel.name}</span>
    </div>
  );
});

type TCategoryDragOverlayProps = {
  categoryId: number;
};

const CategoryDragOverlay = memo(
  ({ categoryId }: TCategoryDragOverlayProps) => {
    const category = useCategoryById(categoryId);

    if (!category) {
      return null;
    }

    return (
      <div className={`${OVERLAY_CLASSNAME} py-1 text-xs font-semibold`}>
        <span className="truncate">{category.name}</span>
      </div>
    );
  }
);

type TSidebarDndProps = {
  children: React.ReactNode;
};

const SidebarDnd = memo(({ children }: TSidebarDndProps) => {
  const can = useCan();
  const {
    categoryIds,
    collisionDetection,
    dragPreview,
    draggedItem,
    onDragCancel,
    onDragEnd,
    onDragOver,
    onDragStart,
    sensors
  } = useSidebarDnd();

  const categorySortableIds = useMemo(
    () => categoryIds.map(categoryDndId),
    [categoryIds]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <ChannelDragPreviewContext.Provider value={dragPreview}>
        <SortableContext
          items={categorySortableIds}
          strategy={verticalListSortingStrategy}
          disabled={!can(Permission.MANAGE_CATEGORIES)}
        >
          {children}
        </SortableContext>
      </ChannelDragPreviewContext.Provider>
      {createPortal(
        <DragOverlay>
          {draggedItem?.type === 'channel' && (
            <ChannelDragOverlay channelId={draggedItem.channelId} />
          )}
          {draggedItem?.type === 'category' && (
            <CategoryDragOverlay categoryId={draggedItem.categoryId} />
          )}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
});

export { SidebarDnd };
