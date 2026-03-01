import { memo, useCallback, useState } from 'react';
import { OverrideLayout } from './layout';
import { LinkOverride } from './link';

type TVideoOverrideProps = {
  src: string;
};

const VideoOverride = memo(({ src }: TVideoOverrideProps) => {
  const [error, setError] = useState(false);

  const onError = useCallback(() => {
    setError(true);
  }, []);

  if (error) return null;

  return (
    <OverrideLayout>
      <video
        src={src}
        controls
        preload="metadata"
        onError={onError}
        className="max-w-full max-h-75 rounded-md"
        crossOrigin="anonymous"
      />
      <LinkOverride link={src} label="Open in new tab" />
    </OverrideLayout>
  );
});

export { VideoOverride };
