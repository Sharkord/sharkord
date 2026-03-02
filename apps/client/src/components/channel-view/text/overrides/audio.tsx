import { memo, useCallback, useState } from 'react';
import { OverrideLayout } from './layout';
import { LinkOverride } from './link';

type TAudioOverrideProps = {
  src: string;
};

const AudioOverride = memo(({ src }: TAudioOverrideProps) => {
  const [error, setError] = useState(false);

  const onError = useCallback(() => {
    setError(true);
  }, []);

  if (error) return null;

  return (
    <OverrideLayout>
      <audio
        src={src}
        controls
        preload="metadata"
        onError={onError}
        className="max-w-full rounded-md"
      />
    </OverrideLayout>
  );
});

export { AudioOverride };
