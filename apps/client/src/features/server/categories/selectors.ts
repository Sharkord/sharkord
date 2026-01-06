import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import { createCachedSelector } from 're-reselect';

export const categoriesSelector = createSelector(
  [(state: IRootState) => state.server.categories],
  (categories) => [...categories].sort((a, b) => a.position - b.position)
);

export const categoryByIdSelector = createCachedSelector(
  [categoriesSelector, (_: IRootState, categoryId: number) => categoryId],
  (categories, categoryId) =>
    categories.find((category) => category.id === categoryId)
)((_, categoryId: number) => categoryId);
