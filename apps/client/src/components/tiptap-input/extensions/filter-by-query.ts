const SUGGESTION_LIMIT = 10;

// prefix matches rank above substring matches, then shorter names win, so typing
// "gen" puts "general" above "urgent-general"
const filterByQuery = <TItem>(
  items: TItem[],
  query: string,
  getName: (item: TItem) => string
): TItem[] => {
  if (!query) return items.slice(0, SUGGESTION_LIMIT);

  const normalizedQuery = query.toLowerCase();

  return items
    .filter((item) => getName(item).toLowerCase().includes(normalizedQuery))
    .sort((a, b) => {
      const aName = getName(a).toLowerCase();
      const bName = getName(b).toLowerCase();

      const aStartsWith = aName.startsWith(normalizedQuery);
      const bStartsWith = bName.startsWith(normalizedQuery);

      if (aStartsWith !== bStartsWith) {
        return aStartsWith ? -1 : 1;
      }

      return aStartsWith ? aName.length - bName.length : 0;
    })
    .slice(0, SUGGESTION_LIMIT);
};

export { SUGGESTION_LIMIT, filterByQuery };
