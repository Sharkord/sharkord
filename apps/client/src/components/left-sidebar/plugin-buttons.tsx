import { ErrorBoundary } from '@/components/error-boundary';
import { setActiveFullscreenPluginId } from '@/features/server/actions';
import {
  useActiveFullscreenPluginId,
  useActivePluginPageId,
  useSidebarPluginPages
} from '@/features/server/hooks';
import { usePluginMetadata } from '@/features/server/plugins/hooks';
import type { TSidebarPluginPage } from '@/features/server/selectors';
import { cn, Tooltip } from '@sharkord/ui';
import { Package, X } from 'lucide-react';
import { memo, useCallback } from 'react';
import { ImageWithFallback } from '../server-screens/server-settings/plugins/marketplace/image-with-fallback';

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

const PluginButton = memo(
  ({ pluginId, pageId, label, icon }: TSidebarPluginPage) => {
    const activeFullscreenPluginId = useActiveFullscreenPluginId();
    const activePluginPageId = useActivePluginPageId();
    const isActive =
      activeFullscreenPluginId === pluginId && activePluginPageId === pageId;

    const handleClick = useCallback(() => {
      if (isActive) {
        setActiveFullscreenPluginId(undefined);

        return;
      }

      setActiveFullscreenPluginId(pluginId, pageId);
    }, [isActive, pluginId, pageId]);

    return (
      <Tooltip content={`${isActive ? 'Close' : 'Open'} ${label}`}>
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            isActive &&
              'bg-accent text-accent-foreground ring-1 ring-inset ring-primary/30'
          )}
        >
          <PluginPageIcon pluginId={pluginId} icon={icon} />
          <span className="flex-1 text-left truncate">{label}</span>
          {isActive && <X className="h-4 w-4" />}
        </button>
      </Tooltip>
    );
  }
);

const PluginButtons = memo(() => {
  const sidebarPages = useSidebarPluginPages();

  if (sidebarPages.length === 0) return null;

  return (
    <div className="space-y-1 border-b border-border px-2 py-2">
      {sidebarPages.map((page) => (
        <PluginButton key={`${page.pluginId}:${page.pageId ?? ''}`} {...page} />
      ))}
    </div>
  );
});

export { PluginButtons };
