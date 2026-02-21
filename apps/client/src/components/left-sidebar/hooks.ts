import { getLocalStorageItemAsJSON, LocalStorageKey } from '@/helpers/storage';
import { useCallback, useMemo, useState } from 'react';

const loadExpandedValue = (categoryId: number): boolean => {
  const expandedMap = getLocalStorageItemAsJSON<Record<number, boolean>>(
    LocalStorageKey.CATEGORIES_EXPANDED,
    {}
  );

  return expandedMap?.[categoryId] ?? true;
};

const saveExpandedValue = (categoryId: number, expanded: boolean): void => {
  const expandedMap = getLocalStorageItemAsJSON<Record<number, boolean>>(
    LocalStorageKey.CATEGORIES_EXPANDED,
    {}
  );

  const newExpandedMap = {
    ...expandedMap,
    [categoryId]: expanded
  };

  localStorage.setItem(
    LocalStorageKey.CATEGORIES_EXPANDED,
    JSON.stringify(newExpandedMap)
  );
};

const useCategoryExpanded = (categoryId: number) => {
  const [expanded, setExpanded] = useState(loadExpandedValue(categoryId));

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const newValue = !prev;

      saveExpandedValue(categoryId, newValue);

      return newValue;
    });
  }, [categoryId]);

  return useMemo(
    () => ({ expanded, toggleExpanded }),
    [expanded, toggleExpanded]
  );
};

export { useCategoryExpanded };
