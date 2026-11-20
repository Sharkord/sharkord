import { Info } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const H264HighAlert = memo(() => {
  const { t } = useTranslation('settings');

  return (
    <div className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>{t('h264HighCodecInfo')}</p>
    </div>
  );
});

export { H264HighAlert };
