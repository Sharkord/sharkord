import { memo } from 'react';
import { cn } from '../lib/utils';

type TShortcutRowProps = {
  label: string;
  keys: string;
  className?: string;
};

const ShortcutRow = memo(({ label, keys, className }: TShortcutRowProps) => (
  <div
    className={cn('flex items-center justify-between gap-4 text-sm', className)}
  >
    <span>{label}</span>
    <kbd className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs">
      {keys}
    </kbd>
  </div>
));

export { ShortcutRow };
