import { openDialog } from '@/features/dialogs/actions';
import { Search } from 'lucide-react';
import { memo, useCallback, useEffect } from 'react';
import { Dialog } from '../dialogs/dialogs';

const ServerSearch = memo(() => {
  const openSearchDialog = useCallback(() => {
    openDialog(Dialog.SEARCH);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearchDialog();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearchDialog]);

  return (
    <button
      type="button"
      onClick={openSearchDialog}
      className="flex w-96 max-w-2xl items-center gap-2 rounded-md border border-border/80 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted"
    >
      <Search className="h-3.5 w-3.5 animate-pulse" />
      <span className="truncate text-left">Search for content...</span>
      <span className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] md:inline">
        Ctrl+K
      </span>
    </button>
  );
});

export { ServerSearch };
