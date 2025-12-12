import { openDialog } from '@/features/dialogs/actions';
import {
  useCategories,
  useCategoryById
} from '@/features/server/categories/hooks';
import { Permission } from '@sharkord/shared';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { Dialog } from '../dialogs/dialogs';
import { Protect } from '../protect';
import { IconButton } from '../ui/icon-button';
import { Channels } from './channels';

type TCategoryProps = {
  categoryId: number;
};

const Category = memo(({ categoryId }: TCategoryProps) => {
  const [expanded, setExpanded] = useState(true);
  const category = useCategoryById(categoryId);

  const onCreateChannelClick = useCallback(() => {
    openDialog(Dialog.CREATE_CHANNEL, { categoryId });
  }, [categoryId]);

  if (!category) {
    return null;
  }

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div key={category.id} className="mb-4">
      <div className="mb-1 flex w-full items-center px-2 py-1 text-xs font-semibold text-muted-foreground">
        <div className="flex w-full items-center gap-1">
          <IconButton
            variant="ghost"
            size="sm"
            icon={ChevronIcon}
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Collapse category' : 'Expand category'}
          />
          <span>{category.name}</span>
        </div>

        <Protect permission={Permission.MANAGE_CHANNELS}>
          <IconButton
            variant="ghost"
            size="sm"
            icon={Plus}
            onClick={onCreateChannelClick}
            title="Create channel"
          />
        </Protect>
      </div>

      {expanded && <Channels categoryId={category.id} />}
    </div>
  );
});

const Categories = memo(() => {
  const categories = useCategories();

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {categories.map((category) => (
        <Category key={category.id} categoryId={category.id} />
      ))}
    </div>
  );
});

export { Categories };
