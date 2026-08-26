import { cn } from '@/lib/utils';
import type { TIconButtonSize } from '@sharkord/ui';

// cards shrink to the thumbnail strip when another card is pinned
const cardDensity = (isCompact: boolean) => ({
  inset: isCompact ? 'p-1' : 'p-2',
  label: isCompact ? 'text-xs' : 'text-sm',
  icon: (isCompact ? 'xs' : 'sm') as TIconButtonSize
});

// a fixed height rather than padding around whatever is inside: the name is revealed on
// hover and its line box is taller than the state icons, so a height that follows the
// content moves the icons every time the pointer crosses the card
const cardBadgeClass = (isCompact: boolean) =>
  cn(
    'inline-flex min-w-0 items-center bg-black/70 rounded overflow-hidden truncate',
    isCompact ? 'h-6 gap-2 px-2' : 'h-7 gap-3 px-3'
  );

const cardControlsClass = (isCompact: boolean) =>
  cn(
    'inline-flex items-center bg-black/70 rounded gap-0.5 px-1',
    isCompact ? 'h-6' : 'h-7'
  );

const cardControlClass = (isActive?: boolean) =>
  cn(
    'rounded p-1 shrink-0 hover:bg-white/10',
    isActive &&
      'bg-zinc-300/80 text-zinc-800 hover:bg-zinc-400/90 hover:text-zinc-900'
  );

export { cardBadgeClass, cardControlClass, cardControlsClass, cardDensity };
