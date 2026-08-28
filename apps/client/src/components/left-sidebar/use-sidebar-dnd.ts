import { useCategories } from '@/features/server/categories/hooks';
import { useChannelIdsByCategory } from '@/features/server/channels/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDndContext,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { getTrpcError } from '@sharkord/shared';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ChannelDragPreviewContext,
  type TChannelDragPreview,
  type TSidebarDragData,
  applyChannelDragPreview,
  categoryDndId
} from './helpers';

const NO_CHANNELS: number[] = [];

const DRAG_ACTIVATION_DISTANCE = 8;

const CATEGORY_AUTO_EXPAND_DELAY = 600;

export const useChannelDragPreview = () =>
  useContext(ChannelDragPreviewContext);

export const useCategoryAutoExpand = (
  categoryId: number,
  expanded: boolean,
  expand: () => void
) => {
  const { active, over } = useDndContext();

  const isDraggingChannel =
    (active?.data.current as TSidebarDragData | undefined)?.type === 'channel';
  const isOver =
    (over?.data.current as TSidebarDragData | undefined)?.categoryId ===
    categoryId;

  useEffect(() => {
    if (expanded || !isOver || !isDraggingChannel) {
      return;
    }

    const timeout = setTimeout(expand, CATEGORY_AUTO_EXPAND_DELAY);

    return () => clearTimeout(timeout);
  }, [expanded, isOver, isDraggingChannel, expand]);
};

export const useSidebarDnd = () => {
  const { t } = useTranslation('sidebar');
  const categories = useCategories();
  const channelIdsByCategory = useChannelIdsByCategory();

  const [dragPreview, setDragPreview] = useState<TChannelDragPreview | null>(
    null
  );
  const [draggedItem, setDraggedItem] = useState<TSidebarDragData | null>(null);

  const categoryIds = useMemo(
    () => categories.map((category) => category.id),
    [categories]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE
      }
    })
  );

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    const collisions =
      pointerCollisions.length > 0 ? pointerCollisions : closestCorners(args);
    const activeData = args.active.data.current as TSidebarDragData | undefined;

    if (activeData?.type !== 'category') {
      return collisions;
    }

    return collisions.map((collision) => {
      const collisionData = args.droppableContainers.find(
        (container) => container.id === collision.id
      )?.data.current as TSidebarDragData | undefined;

      if (!collisionData) {
        return collision;
      }

      return { ...collision, id: categoryDndId(collisionData.categoryId) };
    });
  }, []);

  useEffect(() => {
    if (!dragPreview) {
      return;
    }

    const categoryChannelIds =
      channelIdsByCategory[dragPreview.categoryId] ?? NO_CHANNELS;

    if (categoryChannelIds.includes(dragPreview.channelId)) {
      setDragPreview(null);
    }
  }, [channelIdsByCategory, dragPreview]);

  const orderedChannelIds = useCallback(
    (categoryId: number) =>
      applyChannelDragPreview(
        channelIdsByCategory[categoryId] ?? NO_CHANNELS,
        categoryId,
        dragPreview
      ),
    [channelIdsByCategory, dragPreview]
  );

  const reorderCategories = useCallback(
    async (activeCategoryId: number, overCategoryId: number) => {
      const oldIndex = categoryIds.indexOf(activeCategoryId);
      const newIndex = categoryIds.indexOf(overCategoryId);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const trpc = getTRPCClient();

      try {
        await trpc.categories.reorder.mutate({
          categoryIds: arrayMove(categoryIds, oldIndex, newIndex)
        });
      } catch (error) {
        toast.error(getTrpcError(error, t('failedReorderCategories')));
      }
    },
    [categoryIds, t]
  );

  const reorderChannels = useCallback(
    async (active: TSidebarDragData, over: TSidebarDragData) => {
      if (active.type !== 'channel') {
        return;
      }

      const targetCategoryId = over.categoryId;

      const previewedChannelIds = orderedChannelIds(targetCategoryId);
      const oldIndex = previewedChannelIds.indexOf(active.channelId);
      const newIndex =
        over.type === 'channel'
          ? previewedChannelIds.indexOf(over.channelId)
          : previewedChannelIds.length - 1;

      if (oldIndex === -1 || newIndex === -1) {
        setDragPreview(null);

        return;
      }

      const nextChannelIds = arrayMove(previewedChannelIds, oldIndex, newIndex);
      const currentChannelIds =
        channelIdsByCategory[targetCategoryId] ?? NO_CHANNELS;
      const isUnchanged =
        nextChannelIds.length === currentChannelIds.length &&
        nextChannelIds.every((id, index) => id === currentChannelIds[index]);

      if (isUnchanged) {
        setDragPreview(null);

        return;
      }

      const trpc = getTRPCClient();

      try {
        await trpc.channels.reorder.mutate({
          categoryId: targetCategoryId,
          channelIds: nextChannelIds
        });
      } catch (error) {
        setDragPreview(null);
        toast.error(getTrpcError(error, t('failedReorderChannels')));
      }
    },
    [channelIdsByCategory, orderedChannelIds, t]
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    setDraggedItem(
      (event.active.data.current as TSidebarDragData | undefined) ?? null
    );
  }, []);

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;

      if (!over) {
        return;
      }

      const activeData = active.data.current as TSidebarDragData | undefined;
      const overData = over.data.current as TSidebarDragData | undefined;

      // a collapsed category renders no channel list, so previewing into one would
      // unmount the channel being dragged. it only auto expands on hover
      if (
        activeData?.type !== 'channel' ||
        !overData ||
        overData.type === 'category' ||
        activeData.categoryId === overData.categoryId
      ) {
        return;
      }

      const targetChannelIds = orderedChannelIds(overData.categoryId).filter(
        (channelId) => channelId !== activeData.channelId
      );

      let index = targetChannelIds.length;

      if (overData.type === 'channel') {
        const overIndex = targetChannelIds.indexOf(overData.channelId);
        const draggedRect = active.rect.current.translated;
        const isBelowOverItem =
          !!draggedRect &&
          draggedRect.top > over.rect.top + over.rect.height / 2;

        if (overIndex !== -1) {
          index = overIndex + (isBelowOverItem ? 1 : 0);
        }
      }

      setDragPreview({
        channelId: activeData.channelId,
        categoryId: overData.categoryId,
        index
      });
    },
    [orderedChannelIds]
  );

  const onDragCancel = useCallback(() => {
    setDraggedItem(null);
    setDragPreview(null);
  }, []);

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setDraggedItem(null);

      if (!over) {
        setDragPreview(null);

        return;
      }

      const activeData = active.data.current as TSidebarDragData | undefined;
      const overData = over.data.current as TSidebarDragData | undefined;

      if (!activeData || !overData) {
        setDragPreview(null);

        return;
      }

      if (activeData.type === 'category') {
        // a category dropped onto a channel or a category body means nothing
        if (overData.type !== 'category' || active.id === over.id) {
          return;
        }

        await reorderCategories(activeData.categoryId, overData.categoryId);

        return;
      }

      await reorderChannels(activeData, overData);
    },
    [reorderCategories, reorderChannels]
  );

  return {
    categoryIds,
    collisionDetection,
    dragPreview,
    draggedItem,
    onDragCancel,
    onDragEnd,
    onDragOver,
    onDragStart,
    sensors
  };
};
