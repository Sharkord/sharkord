import { cn } from '@sharkord/ui';
import { useCallback, useState } from 'react';

type ImageWithFallbackProps = {
  src: string;
  alt: string;
  className?: string;
  iconFallback?: React.ReactNode;
};

const ImageWithFallback = ({
  src,
  alt,
  className,
  iconFallback = null
}: ImageWithFallbackProps) => {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  if (hasError) {
    return (
      <div
        className={cn(
          'rounded-md bg-muted flex items-center justify-center',
          className
        )}
      >
        {iconFallback}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
      onLoad={() => setHasError(false)}
    />
  );
};

export { ImageWithFallback };
