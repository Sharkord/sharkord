import { cn } from '@/lib/utils';
import { memo, useCallback, useState } from 'react';

type TAvatarImageProps = {
  src: string;
  className?: string;
};

const AvatarImage = memo(({ src, className }: TAvatarImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const onLoad = useCallback(() => setLoaded(true), []);
  const onError = useCallback(() => setFailed(true), []);

  if (failed) return null;

  return (
    <img
      src={src}
      alt=""
      onLoad={onLoad}
      onError={onError}
      className={cn(
        'absolute inset-0 aspect-square size-full bg-muted',
        className,
        !loaded && 'hidden'
      )}
    />
  );
});

export { AvatarImage };
