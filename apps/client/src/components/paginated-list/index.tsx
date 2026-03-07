import { Button, cn, Input } from '@sharkord/ui';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ChangeEvent,
  type Key,
  type ReactElement,
  type ReactNode
} from 'react';

type TPaginatedListContext<T = unknown> = {
  filteredItems: T[];
  paginatedItems: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  itemsPerPage: number;
};

const PaginatedListContext = createContext<TPaginatedListContext | null>(null);

// if we use an arrow function here instead of function, the code highlighter gets very confused and breaks down completely
function usePaginatedList<T = unknown>() {
  const context = useContext(PaginatedListContext);

  if (!context) {
    throw new Error(
      'PaginatedList components must be used within <PaginatedList />'
    );
  }

  return context as TPaginatedListContext<T>;
}

type TPaginatedListProps<T> = {
  items: T[];
  itemsPerPage?: number;
  searchFilter?: (item: T, searchTerm: string) => boolean;
  children: ReactNode;
};

const PaginatedListRoot = <T,>({
  items,
  itemsPerPage = 10,
  searchFilter,
  children
}: TPaginatedListProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTermRaw] = useState('');

  const setSearchTerm = useCallback((value: string) => {
    setSearchTermRaw(value);
    setCurrentPage(1);
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchTerm || !searchFilter) {
      return items;
    }

    return items.filter((item) => searchFilter(item, searchTerm));
  }, [items, searchFilter, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / itemsPerPage)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;

    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, safeCurrentPage, itemsPerPage]);

  const setPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    setPage(safeCurrentPage + 1);
  }, [safeCurrentPage, setPage]);

  const prevPage = useCallback(() => {
    setPage(safeCurrentPage - 1);
  }, [safeCurrentPage, setPage]);

  const value = useMemo<TPaginatedListContext>(
    () => ({
      filteredItems: filteredItems as unknown[],
      paginatedItems: paginatedItems as unknown[],
      currentPage: safeCurrentPage,
      totalPages,
      totalItems: filteredItems.length,
      searchTerm,
      setSearchTerm,
      setPage,
      nextPage,
      prevPage,
      itemsPerPage
    }),
    [
      filteredItems,
      paginatedItems,
      safeCurrentPage,
      totalPages,
      searchTerm,
      setSearchTerm,
      setPage,
      nextPage,
      prevPage,
      itemsPerPage
    ]
  );

  return (
    <PaginatedListContext.Provider value={value}>
      {children}
    </PaginatedListContext.Provider>
  );
};

type TPaginatedListSearchProps = {
  placeholder?: string;
  className?: string;
};

const PaginatedListSearch = memo(
  ({ placeholder = 'Search...', className }: TPaginatedListSearchProps) => {
    const { searchTerm, setSearchTerm } = usePaginatedList();

    const onChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
      },
      [setSearchTerm]
    );

    return (
      <Input
        value={searchTerm}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
      />
    );
  }
);

type TPaginatedListInfoProps = {
  className?: string;
  showPage?: boolean;
};

const PaginatedListInfo = memo(
  ({ className, showPage = true }: TPaginatedListInfoProps) => {
    const { totalItems, currentPage, totalPages } = usePaginatedList();

    return (
      <div
        className={cn(
          'flex items-center justify-between text-xs text-muted-foreground',
          className
        )}
      >
        <span>
          {totalItems} item{totalItems !== 1 ? 's' : ''}
        </span>
        {showPage && totalPages > 1 && (
          <span>
            Page {currentPage} of {totalPages}
          </span>
        )}
      </div>
    );
  }
);

type TPaginatedListListProps<T> = {
  className?: string;
  getItemKey?: (item: T, index: number) => Key;
  children: (item: T, index: number) => ReactNode;
};

const PaginatedListListInner = <T,>({
  className,
  getItemKey,
  children
}: TPaginatedListListProps<T>) => {
  const { paginatedItems, currentPage, itemsPerPage } = usePaginatedList<T>();

  if (paginatedItems.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {paginatedItems.map((item, pageIndex) => {
        const absoluteIndex = (currentPage - 1) * itemsPerPage + pageIndex;
        const key = getItemKey
          ? getItemKey(item, absoluteIndex)
          : absoluteIndex;

        return <div key={key}>{children(item, absoluteIndex)}</div>;
      })}
    </div>
  );
};

type TPaginatedListItemProps = {
  className?: string;
  children: ReactNode;
};

const PaginatedListItem = memo(
  ({ className, children }: TPaginatedListItemProps) => {
    return <div className={className}>{children}</div>;
  }
);

type TPaginatedListEmptyProps = {
  className?: string;
  children?: ReactNode;
};

const PaginatedListEmpty = memo(
  ({ className, children }: TPaginatedListEmptyProps) => {
    const { totalItems } = usePaginatedList();

    if (totalItems > 0) {
      return null;
    }

    return (
      <div
        className={cn(
          'flex h-32 items-center justify-center text-muted-foreground',
          className
        )}
      >
        {children ?? 'No items found.'}
      </div>
    );
  }
);

type TPaginatedListPaginationProps = {
  className?: string;
  maxVisiblePages?: number;
  alwaysShow?: boolean;
};

const PaginatedListPagination = memo(
  ({
    className,
    maxVisiblePages = 5,
    alwaysShow = false
  }: TPaginatedListPaginationProps) => {
    const { currentPage, totalPages, setPage } = usePaginatedList();

    const pageNumbers = useMemo(() => {
      const pages: number[] = [];

      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        const start = Math.max(
          1,
          currentPage - Math.floor(maxVisiblePages / 2)
        );
        const end = Math.min(totalPages, start + maxVisiblePages - 1);

        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
      }

      return pages;
    }, [currentPage, totalPages, maxVisiblePages]);

    if (!alwaysShow && totalPages <= 1) {
      return null;
    }

    return (
      <div className={cn('flex items-center justify-center gap-1', className)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPage(1)}
          disabled={currentPage === 1}
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {pageNumbers.map((page) => (
          <Button
            key={page}
            type="button"
            variant={page === currentPage ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPage(page)}
            className="min-w-8"
          >
            {page}
          </Button>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPage(totalPages)}
          disabled={currentPage === totalPages}
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }
);

// these ugly af shenanigans are necessary to preserve generic type support while still memoizing the components
const PaginatedListList: <T>(
  props: TPaginatedListListProps<T>
) => ReactElement | null = memo(PaginatedListListInner) as unknown as <T>(
  props: TPaginatedListListProps<T>
) => ReactElement | null;

const PaginatedList = Object.assign(
  memo(PaginatedListRoot) as typeof PaginatedListRoot,
  {
    Search: PaginatedListSearch,
    Info: PaginatedListInfo,
    List: PaginatedListList,
    Item: PaginatedListItem,
    Empty: PaginatedListEmpty,
    Pagination: PaginatedListPagination
  }
);

export { PaginatedList };
