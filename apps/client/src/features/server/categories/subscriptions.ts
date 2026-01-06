import { getTRPCClient } from '@/lib/trpc';
import type { TCategory } from '@sharkord/shared';
import { addCategory, removeCategory, updateCategory } from './actions';

const subscribeToCategories = () => {
  const trpc = getTRPCClient();

  const onCategoryCreateSub = trpc.categories.onCreate.subscribe(undefined, {
    onData: (category: TCategory) => addCategory(category),
    onError: (err) => console.error('onCategoryCreate subscription error:', err)
  });

  const onCategoryDeleteSub = trpc.categories.onDelete.subscribe(undefined, {
    onData: (categoryId: number) => removeCategory(categoryId),
    onError: (err) => console.error('onCategoryDelete subscription error:', err)
  });

  const onCategoryUpdateSub = trpc.categories.onUpdate.subscribe(undefined, {
    onData: (category: TCategory) => updateCategory(category.id, category),
    onError: (err) => console.error('onCategoryUpdate subscription error:', err)
  });

  return () => {
    onCategoryCreateSub.unsubscribe();
    onCategoryDeleteSub.unsubscribe();
    onCategoryUpdateSub.unsubscribe();
  };
};

export { subscribeToCategories };
