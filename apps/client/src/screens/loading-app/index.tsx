import { loadApp } from '@/features/app/actions';
import { useStrictEffect } from '@/hooks/use-strict-effect';
import { Spinner } from '@sharkord/ui';
import { memo } from 'react';

type TLoadingApp = {
  text: string;
};

const LoadingApp = memo(({ text = 'Loading' }: TLoadingApp) => {
  useStrictEffect(() => {
    loadApp();
  }, []);

  return (
    <div className="flex flex-col justify-center items-center h-full gap-2">
      <Spinner size="lg" />
      <span className="text-xl">{text}</span>
    </div>
  );
});

export { LoadingApp };
