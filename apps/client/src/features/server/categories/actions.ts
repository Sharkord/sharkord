import { store } from '@/features/store';
import type { TCategory } from '@sharkord/shared';
import { serverSliceActions } from '../slice';

// export const setCategories = (categories: TCategory[]) => {
//   store.dispatch(serverSliceActions.setCategories(categories));
// };

export const setCategories = (categories: TCategory[]) => {
  store.dispatch(serverSliceActions.setCategories(categories));
};

export const addCategory = (category: TCategory) => {
  store.dispatch(serverSliceActions.addCategory(category));
};

export const updateCategory = (
  categoryId: number,
  category: Partial<TCategory>
) => {
  store.dispatch(serverSliceActions.updateCategory({ categoryId, category }));
};

export const removeCategory = (categoryId: number) => {
  store.dispatch(serverSliceActions.removeCategory({ categoryId }));
};
