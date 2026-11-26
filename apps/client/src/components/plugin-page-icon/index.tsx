import { ErrorBoundary } from '@/components/error-boundary';
import { ImageWithFallback } from '@/components/server-screens/server-settings/plugins/marketplace/image-with-fallback';
import { usePluginMetadata } from '@/features/server/plugins/hooks';
import type { TSidebarPluginPage } from '@/features/server/selectors';
import { Package } from 'lucide-react';
import { memo } from 'react';

const fallbackIcon = <Package className="h-4 w-4 text-muted-foreground" />;

type TPluginPageIconProps = Pick<TSidebarPluginPage, 'pluginId' | 'icon'>;

const PluginPageIcon = memo(({ pluginId, icon }: TPluginPageIconProps) => {
  const pluginMetadata = usePluginMetadata(pluginId);

  if (icon && typeof icon !== 'string') {
    const Icon = icon;

    return (
      <ErrorBoundary fallback={fallbackIcon}>
        <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden [&>svg]:h-4 [&>svg]:w-4">
          <Icon />
        </span>
      </ErrorBoundary>
    );
  }

  const src = icon ?? pluginMetadata?.avatarUrl;

  return (
    <ImageWithFallback
      key={src}
      src={src}
      alt={`${pluginId} icon`}
      className="h-4 w-4 rounded-sm"
      iconFallback={fallbackIcon}
    />
  );
});

export { PluginPageIcon };
