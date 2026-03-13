import { setActiveFullscreenPluginId } from '@/features/app/actions';
import { useActiveFullscreenPluginId } from '@/features/app/hooks';
import { useFullscreenPluginIds } from '@/features/server/plugins/hooks';
import { cn, Tooltip } from '@sharkord/ui';
import { PuzzleIcon, X } from 'lucide-react';
import { memo, useCallback } from 'react';

const PluginSidebarButton = memo(({ pluginId }: { pluginId: string }) => {
  const activeFullscreenPluginId = useActiveFullscreenPluginId();
  const isActive = activeFullscreenPluginId === pluginId;

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
          isActive && 'bg-accent text-accent-foreground ring-1 ring-primary/30'
        )}
      >
        <PuzzleIcon className="h-4 w-4" />
        <span className="flex-1 text-left truncate">{pluginId}</span>
        {isActive && <X className="h-4 w-4" />}
      </button>
    </Tooltip>
  );
});

export const PluginSidebarButtons = memo(() => {
  const sidebarPluginIds = useFullscreenPluginIds();

  if (sidebarPluginIds.length === 0) return null;

  return (
    <div className="border-b border-border px-2 py-2">
      {sidebarPluginIds.map((pluginId) => (
        <PluginSidebarButton key={pluginId} pluginId={pluginId} />
      ))}
    </div>
  );
});
