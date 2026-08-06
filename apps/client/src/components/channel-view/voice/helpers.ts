import { cn } from '@/lib/utils';
import type { TIconButtonSize } from '@sharkord/ui';

// cards shrink to the thumbnail strip when another card is pinned
const cardDensity = (isCompact: boolean) => ({
  inset: isCompact ? 'p-1' : 'p-4',
  badge: isCompact ? 'gap-2 px-2' : 'gap-3 px-3',
  label: isCompact ? 'text-xs' : 'text-sm',
  controls: isCompact ? 'gap-0.5' : 'gap-1',
  icon: (isCompact ? 'xs' : 'sm') as TIconButtonSize
});

const cardControlClass = (isCompact: boolean, isActive?: boolean) =>
  cn(
    'bg-black/70 rounded py-1.5 shrink-0 hover:bg-black/80',
    isCompact ? 'px-2' : 'px-2.5',
    isActive &&
      'bg-zinc-300/80 text-zinc-800 hover:bg-zinc-400/90 hover:text-zinc-900'
  );

export { cardControlClass, cardDensity };
