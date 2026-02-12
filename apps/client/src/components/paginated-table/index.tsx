import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TPaginatedTableProps<T> = {
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  searchFilter: (item: T, searchTerm: string) => boolean;
  headerColumns: React.ReactNode;
  gridCols: string;
  itemsPerPage?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
};

const PaginatedTableComponent = <T,>({
  items,
  renderRow,
  searchFilter,
  headerColumns,
  gridCols,
  itemsPerPage = 10,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No items found.'
}: TPaginatedTableProps<T>) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter((item) => searchFilter(item, searchTerm));
  }, [items, searchTerm, searchFilter]);

  const totalPages = useMemo(
    () => Math.ceil(filteredItems.length / itemsPerPage),
    [filteredItems, itemsPerPage]
  );

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const getPageNumbers = useCallback(() => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <div
          className={`grid ${gridCols} gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground`}
        >
          {headerColumns}
        </div>

        <div className="divide-y">
          {paginatedItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              {searchTerm.trim()
                ? t('pagination.noItemsFoundMatching', {
                    searchTerm
                  })
                : emptyMessage}
            </div>
          ) : (
            paginatedItems.map((item, index) => (
              <div key={index}>
                {renderRow(item, (currentPage - 1) * itemsPerPage + index)}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          {filteredItems.length === 0 ? (
            t('pagination.noItemsFound')
          ) : (
            t(
              filteredItems.length === 1
                ? 'pagination.showingRangeSingular'
                : 'pagination.showingRangePlural',
              {
                start: (currentPage - 1) * itemsPerPage + 1,
                end: Math.min(currentPage * itemsPerPage, filteredItems.length),
                total: filteredItems.length
              }
            )
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {getPageNumbers().map((pageNum) => (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                className="min-w-8"
              >
                {pageNum}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const PaginatedTable = memo(PaginatedTableComponent) as <T>(
  props: TPaginatedTableProps<T>
) => React.ReactElement;

export { PaginatedTable };
