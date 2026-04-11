import { openDialog } from '@/features/dialogs/actions';
import { Search } from 'lucide-react';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../dialogs/dialogs';
import { ShortcutRegistrar } from '../shortcut-registrar';

const ServerSearch = memo(() => {
  const { t } = useTranslation('topbar');
  const openSearchDialog = useCallback(() => {
    openDialog(Dialog.SEARCH);
  }, []);

  useEffect(() => {
    ShortcutRegistrar.register(['control'], 'k', openSearchDialog);
    return () => {
      ShortcutRegistrar.deregister(['control'], 'k');
    };
  }, [openSearchDialog]);

  return (
    <button
      type="button"
      onClick={openSearchDialog}
      className="flex w-96 max-w-2xl items-center gap-2 rounded-md border border-border/80 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted"
    >
      <Search className="h-3.5 w-3.5 animate-pulse" />
      <span className="truncate text-left">{t('searchContent')}</span>
      <span className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] md:inline">
        Ctrl+K
      </span>
    </button>
  );
});

export { ServerSearch };
