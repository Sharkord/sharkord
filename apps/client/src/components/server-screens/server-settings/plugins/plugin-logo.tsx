import { cn } from '@/lib/utils';
import { AlertTriangle, Package } from 'lucide-react';
import { memo } from 'react';
import { ImageWithFallback } from './marketplace/image-with-fallback';

type TPluginLogoProps = {
  src?: string;
  hasError?: boolean;
  dimmed?: boolean;
};

const PluginLogo = memo(({ src, hasError, dimmed }: TPluginLogoProps) => {
  if (hasError) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>
    );
  }

  const fallback = <Package className="h-5 w-5 text-muted-foreground" />;

  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted',
        dimmed && 'opacity-50 grayscale'
      )}
    >
      {src ? (
        <ImageWithFallback
          src={src}
          alt=""
          className="h-9 w-9 object-cover"
          iconFallback={fallback}
        />
      ) : (
        fallback
      )}
    </div>
  );
});

export { PluginLogo };
