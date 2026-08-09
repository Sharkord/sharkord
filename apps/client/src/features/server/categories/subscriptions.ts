import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TCategory } from '@sharkord/shared';
import { handleSubscriptionError } from '../subscription-error';
import { addCategory, removeCategory, updateCategory } from './actions';

const subscribeToCategories = () => {
  const trpc = getTRPCClient();

  const onCategoryCreateSub = trpc.categories.onCreate.subscribe(undefined, {
    onData: (category: TCategory) => {
      logDebug('[EVENTS] categories.onCreate', { category });
      addCategory(category);
    },
    onError: handleSubscriptionError('onCategoryCreate')
  });

  const onCategoryDeleteSub = trpc.categories.onDelete.subscribe(undefined, {
    onData: (categoryId: number) => {
      logDebug('[EVENTS] categories.onDelete', { categoryId });
      removeCategory(categoryId);
    },
    onError: handleSubscriptionError('onCategoryDelete')
  });

  const onCategoryUpdateSub = trpc.categories.onUpdate.subscribe(undefined, {
    onData: (category: TCategory) => {
      logDebug('[EVENTS] categories.onUpdate', { category });
      updateCategory(category.id, category);
    },
    onError: handleSubscriptionError('onCategoryUpdate')
  });

  return () => {
    onCategoryCreateSub.unsubscribe();
    onCategoryDeleteSub.unsubscribe();
    onCategoryUpdateSub.unsubscribe();
  };
};

export { subscribeToCategories };
