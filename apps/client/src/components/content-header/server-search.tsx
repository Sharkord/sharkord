import { openDialog } from '@/features/dialogs/actions';
import { formatAccelerator, IconButton, Tooltip } from '@sharkord/ui';
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
    <Tooltip
      content={`${t('searchContent')} (${formatAccelerator('CmdOrCtrl+K')})`}
    >
      <IconButton
        icon={Search}
        variant="ghost"
        size="sm"
        onClick={openSearchDialog}
        aria-label={t('searchContent')}
      />
    </Tooltip>
  );
});

export { ServerSearch };
