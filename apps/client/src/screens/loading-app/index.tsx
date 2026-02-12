import Spinner from '@/components/ui/spinner';
import { loadApp } from '@/features/app/actions';
import { useStrictEffect } from '@/hooks/use-strict-effect';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const LoadingApp = memo(() => {
  const { t } = useTranslation();

  useStrictEffect(() => {
    loadApp();
  }, []);

  return (
    <div className="flex flex-col justify-center items-center h-full gap-2">
      <Spinner size="lg" />
      <span className="text-xl">{t('loadingApp.loadingSharkord')}</span>
    </div>
  );
});

export { LoadingApp };
