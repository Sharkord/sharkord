import type { TDialogBaseProps } from '@/components/dialogs/types';
import { PaginatedList } from '@/components/paginated-list';
import { jumpToMessage } from '@/features/server/actions';
import { useUsernames } from '@/features/server/users/hooks';
import { useOnEsc } from '@/hooks/use-on-esc';
import type { TMessageJumpToTarget } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useSearch } from './hooks';
import { SearchResultFileCard } from './search-result-file';
import { SearchResultMessageCard } from './search-result-message';
import type { TUnifiedSearchResult } from './types';

const ITEMS_PER_PAGE = 12;

type TSearchDialogProps = TDialogBaseProps;

const SearchDialog = memo(({ isOpen, close }: TSearchDialogProps) => {
  useOnEsc(close);

  const usernames = useUsernames();

  const { query, setQuery, loading, canSearch, unifiedResults } =
    useSearch(isOpen);

  const onJump = useCallback(
    (target: TMessageJumpToTarget) => {
      jumpToMessage(target);
      close();
    },
    [close]
  );

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="h-[86vh] max-h-[94vh] lg:min-w-7xl gap-0 overflow-hidden p-0"
        onInteractOutside={close}
        close={close}
      >
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-b border-border bg-card/70 px-5 py-4 text-left">
            <DialogTitle className="text-base">Search</DialogTitle>
            <DialogDescription>
              Find content in this server. Both messages and files are
              searchable.
            </DialogDescription>
            <div className="mt-3">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search messages and files..."
                autoFocus
                className="h-10"
              />
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
            {!canSearch && !loading && (
              <div className="flex h-full min-h-55 items-center justify-center rounded-lg bg-muted/20 px-6 text-sm text-muted-foreground">
                Start typing to search messages and files. Type at least 2
                characters.
              </div>
            )}

            {loading && (
              <div className="flex h-full min-h-55 items-center justify-center">
                <Spinner size="sm" />
              </div>
            )}

            {canSearch && !loading && (
              <PaginatedList
                items={unifiedResults}
                itemsPerPage={ITEMS_PER_PAGE}
              >
                <PaginatedList.Empty className="flex h-full min-h-55 items-center justify-center rounded-lg bg-muted/20 px-6 text-sm text-muted-foreground">
                  No results.
                </PaginatedList.Empty>

                <PaginatedList.List<TUnifiedSearchResult>
                  className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
                  getItemKey={(entry) => entry.key}
                >
                  {(entry) => {
                    if (entry.type === 'message') {
                      return (
                        <SearchResultMessageCard
                          message={entry.item}
                          userName={
                            usernames[entry.item.userId] ?? 'Unknown user'
                          }
                          onJump={onJump}
                        />
                      );
                    }

                    return (
                      <SearchResultFileCard
                        result={entry.item}
                        onJump={onJump}
                      />
                    );
                  }}
                </PaginatedList.List>

                <PaginatedList.Pagination
                  alwaysShow
                  className="flex shrink-0 items-center justify-center gap-1 border-t border-border pt-3"
                />
              </PaginatedList>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export { SearchDialog };
