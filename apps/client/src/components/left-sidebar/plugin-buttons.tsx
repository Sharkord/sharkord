import { setActivePluginId } from '@/features/app/actions';
import { useActivePluginId } from '@/features/app/hooks';
import { usePluginComponentsBySlot } from '@/features/server/plugins/hooks';
import { PluginSlot } from '@sharkord/shared';
import { cn, Tooltip } from '@sharkord/ui';
import { PuzzleIcon, X } from 'lucide-react';
import { memo, useMemo } from 'react';

export const PluginSidebarButtons = memo(() => {
  const componentsMap = usePluginComponentsBySlot(PluginSlot.FULL_SCREEN);
  const activePluginId = useActivePluginId();

  const sidebarPluginIds = useMemo(() => {
    return Object.keys(componentsMap);
  }, [componentsMap]);

  if (sidebarPluginIds.length === 0) return null;

  return (
    <div className="border-b border-border px-2 py-2">
      {sidebarPluginIds.map((pluginId) => {
        const isActive = activePluginId === pluginId;

        return (
          <Tooltip
            key={pluginId}
            content={`${isActive ? 'Close' : 'Open'} ${pluginId}`}
          >
            <button
              type="button"
              onClick={() => {
                const nextId = isActive ? undefined : pluginId;
                setActivePluginId(nextId);
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
