import { setActiveFullscreenPluginId } from '@/features/server/actions';
import { useActiveFullscreenPluginId } from '@/features/server/hooks';
import {
  useFullscreenPluginIds,
  usePluginMetadata
} from '@/features/server/plugins/hooks';
import { cn, Tooltip } from '@sharkord/ui';
import { Package, X } from 'lucide-react';
import { memo, useCallback } from 'react';
import { ImageWithFallback } from '../server-screens/server-settings/plugins/marketplace/image-with-fallback';

type TPluginButtonsProps = {
  pluginId: string;
};

const PluginButton = memo(({ pluginId }: TPluginButtonsProps) => {
  const activeFullscreenPluginId = useActiveFullscreenPluginId();
  const isActive = activeFullscreenPluginId === pluginId;
  const pluginMetadata = usePluginMetadata(pluginId);

  const handleClick = useCallback(() => {
    setActiveFullscreenPluginId(isActive ? undefined : pluginId);
  }, [isActive, pluginId]);

  return (
    <Tooltip content={`${isActive ? 'Close' : 'Open'} ${pluginId}`}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          isActive &&
            'bg-accent text-accent-foreground ring-1 ring-inset ring-primary/30'
        )}
      >
        <ImageWithFallback
          src={pluginMetadata?.avatarUrl}
          alt={`${pluginId} icon`}
          className="h-4 w-4 rounded-sm"
          iconFallback={<Package className="h-4 w-4 text-muted-foreground" />}
        />
        <span className="flex-1 text-left truncate">{pluginId}</span>
        {isActive && <X className="h-4 w-4" />}
      </button>
    </Tooltip>
  );
});

const PluginButtons = memo(() => {
  const sidebarPluginIds = useFullscreenPluginIds();

  if (sidebarPluginIds.length === 0) return null;

  return (
    <div className="space-y-1 border-b border-border px-2 py-2">
      {sidebarPluginIds.map((pluginId) => (
        <PluginButton key={pluginId} pluginId={pluginId} />
      ))}
    </div>
  );
});

export { PluginButtons };
