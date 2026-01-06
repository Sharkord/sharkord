import Spinner from '@/components/ui/spinner';
import { loadApp } from '@/features/app/actions';
import { useStrictEffect } from '@/hooks/use-strict-effect';
import { memo } from 'react';

const LoadingApp = memo(() => {
  useStrictEffect(() => {
    loadApp();
  }, []);

  return (
    <div className="flex flex-col justify-center items-center h-full">
      <Spinner size="lg" />
      <span className="mt-4 text-2xl">Loading...</span>
    </div>
  );
});

export { LoadingApp };
