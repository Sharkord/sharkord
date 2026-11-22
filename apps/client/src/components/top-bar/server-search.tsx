import { openDialog } from '@/features/dialogs/actions';
import { IconButton } from '@sharkord/ui';
import { Search } from 'lucide-react';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../dialogs/dialogs';

const ServerSearch = memo(() => {
  const { t } = useTranslation('topbar');
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
    <>
      <IconButton
        icon={Search}
        variant="ghost"
        className="h-9 w-9 md:hidden"
        onClick={openSearchDialog}
        aria-label={t('searchContent')}
      />
      <button
        type="button"
        onClick={openSearchDialog}
        className="flex w-full max-w-96 items-center gap-2 rounded-md border border-border/80 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted max-md:hidden"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="truncate text-left">{t('searchContent')}</span>
        <span className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] md:inline">
          Ctrl+K
        </span>
      </button>
    </>
  );
});

export { ServerSearch };
