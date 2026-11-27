import { ArrowLeft, ArrowRight } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const SwipeHint = memo(() => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground md:hidden">
      <div className="flex items-center gap-2">
        <ArrowRight className="h-4 w-4" />
        {t('swipeRightHint')}
      </div>
      <div className="flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        {t('swipeLeftHint')}
      </div>
    </div>
  );
});

export { SwipeHint };
