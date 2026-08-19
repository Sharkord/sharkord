import { Loader2 } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const ReconnectingBanner = memo(() => {
  const { t } = useTranslation('common');

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-yellow-500/90 px-4 py-1.5 text-sm font-medium text-black"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      {t('reconnecting')}
    </div>
  );
});

export { ReconnectingBanner };
