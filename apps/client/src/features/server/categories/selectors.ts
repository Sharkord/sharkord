import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';

export const categoriesSelector = createSelector(
  [(state: IRootState) => state.server.categories],
  (categories) => [...categories].sort((a, b) => a.position - b.position)
);

export const categoryByIdSelector = createSelector(
  [categoriesSelector, (_, categoryId: number) => categoryId],
  (categories, categoryId) =>
    categories.find((category) => category.id === categoryId)
);
