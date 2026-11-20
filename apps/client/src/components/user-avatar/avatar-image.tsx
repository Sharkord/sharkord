import { cn } from '@/lib/utils';
import { memo, useCallback, useState } from 'react';

type TAvatarImageProps = {
  src: string;
  className?: string;
};

const AvatarImage = memo(({ src, className }: TAvatarImageProps) => {
  const [failed, setFailed] = useState(false);

  const onError = useCallback(() => setFailed(true), []);

  if (failed) return null;

  return (
    <img
      src={src}
      alt=""
      onError={onError}
      className={cn(
        'absolute inset-0 aspect-square size-full bg-muted',
        className
      )}
    />
  );
});

export { AvatarImage };
