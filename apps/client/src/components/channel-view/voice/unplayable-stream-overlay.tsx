import { MonitorX } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TUnplayableStreamOverlayProps = {
  title: string;
};

const UnplayableStreamOverlay = memo(
  ({ title }: TUnplayableStreamOverlayProps) => {
    const { t } = useTranslation('common');

    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black p-4 text-center text-white">
        <MonitorX className="size-6 text-white/70" />
        <p className="text-sm font-medium">{title}</p>
        <p className="max-w-80 text-xs text-white/70">
          {t('cannotPlayStreamCodec')}
        </p>
      </div>
    );
  }
);

export { UnplayableStreamOverlay };
