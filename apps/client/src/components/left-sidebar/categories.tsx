import { openDialog } from '@/features/dialogs/actions';
import {
  useCategories,
  useCategoryById
} from '@/features/server/categories/hooks';
import {
  useCan,
  useCategoryUnreadData,
  useHasVisibleChannelsInCategory
} from '@/features/server/hooks';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Permission, TestId } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CategoryContextMenu } from '../context-menus/category';
import { Dialog } from '../dialogs/dialogs';
import { Protect } from '../protect';
import { UnreadCount } from '../unread-count';
import { Channels } from './channels';
import { categoryDndId } from './helpers';
import { useCategoryExpanded } from './hooks';
import { SidebarDnd } from './sidebar-dnd';
import { useCategoryAutoExpand } from './use-sidebar-dnd';

type TCategoryProps = {
  categoryId: number;
};

const Category = memo(({ categoryId }: TCategoryProps) => {
  const { t } = useTranslation('sidebar');
  const can = useCan();
  const hasVisibleChannelsInCategory =
    useHasVisibleChannelsInCategory(categoryId);
  const { expand, expanded, toggleExpanded } = useCategoryExpanded(categoryId);

  useCategoryAutoExpand(categoryId, expanded, expand);

  const category = useCategoryById(categoryId);
  const { unreadCount, hasUnreadMentions } = useCategoryUnreadData(categoryId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: categoryDndId(categoryId),
    data: { type: 'category', categoryId }
  });

  const onCreateChannelClick = useCallback(() => {
    openDialog(Dialog.CREATE_CHANNEL, { categoryId });
  }, [categoryId]);

  if (
    !category ||
    (!hasVisibleChannelsInCategory &&
      !can([Permission.MANAGE_CHANNELS, Permission.MANAGE_CATEGORIES]))
  ) {
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
      data-testid={TestId.CATEGORY_ITEM}
      data-category-id={category.id}
    >
      <div className="mb-1 flex w-full items-center px-2 py-1 text-xs font-semibold text-muted-foreground">
        <div className="flex w-full items-stretch gap-1">
          <IconButton
            variant="ghost"
            size="sm"
            icon={ChevronIcon}
            onClick={toggleExpanded}
            title={expanded ? t('collapseCategory') : t('expandCategory')}
          />
          <CategoryContextMenu categoryId={category.id}>
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing flex min-w-0 flex-1 items-center gap-2"
            >
              <span className="truncate">{category.name}</span>
              {!expanded && unreadCount > 0 && (
                <UnreadCount
                  count={unreadCount}
                  hasMention={hasUnreadMentions}
                  className="ml-0"
                />
              )}
            </span>
          </CategoryContextMenu>
        </div>

        <Protect permission={Permission.MANAGE_CHANNELS}>
          <IconButton
            data-testid={TestId.CATEGORY_ADD_CHANNEL}
            variant="ghost"
            size="sm"
            icon={Plus}
            onClick={onCreateChannelClick}
            title={t('createChannel')}
          />
        </Protect>
      </div>

      {expanded && !isDragging && <Channels categoryId={category.id} />}
    </div>
  );
});

const Categories = memo(() => {
  const categories = useCategories();

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <SidebarDnd>
        {categories.map((category) => (
          <Category key={category.id} categoryId={category.id} />
        ))}
      </SidebarDnd>
    </div>
  );
});

export { Categories };
