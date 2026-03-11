import { setActiveFullscreenPluginId } from '@/features/app/actions';
import { useActiveFullscreenPluginId } from '@/features/app/hooks';
import { useFullscreenPluginIds } from '@/features/server/plugins/hooks';
import { cn, Tooltip } from '@sharkord/ui';
import { PuzzleIcon, X } from 'lucide-react';
import { memo } from 'react';

export const PluginSidebarButtons = memo(() => {
  // Use the new cached selector hook instead of useMemo and the components map
  const sidebarPluginIds = useFullscreenPluginIds();
  // Use the newly renamed hook
  const activeFullscreenPluginId = useActiveFullscreenPluginId();

  if (sidebarPluginIds.length === 0) return null;

  return (
    <div className="border-b border-border px-2 py-2">
      {sidebarPluginIds.map((pluginId) => {
        const isActive = activeFullscreenPluginId === pluginId;

        return (
          <Tooltip
            key={pluginId}
            content={`${isActive ? 'Close' : 'Open'} ${pluginId}`}
          >
            <button
              type="button"
              onClick={() => {
                const nextId = isActive ? undefined : pluginId;
                // Use the newly renamed action
                setActiveFullscreenPluginId(nextId);
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                isActive &&
                  'bg-accent text-accent-foreground ring-1 ring-primary/30'
              )}
            >
              <PuzzleIcon className="h-4 w-4" />
              <span className="flex-1 text-left truncate">{pluginId}</span>
              {isActive && <X className="h-4 w-4" />}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
});