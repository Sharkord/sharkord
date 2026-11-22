import { useOpenViewTitle } from '@/features/server/hooks';
import { ChannelType } from '@sharkord/shared';
import { AtSign, Hash, Volume2, type LucideIcon } from 'lucide-react';
import { memo } from 'react';

const OpenViewTitle = memo(() => {
  const title = useOpenViewTitle();

  if (!title) return null;

  let Icon: LucideIcon = AtSign;

  if (title.kind === 'channel') {
    Icon = title.type === ChannelType.VOICE ? Volume2 : Hash;
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5 md:hidden">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate font-semibold">{title.name}</span>
    </div>
  );
});

export { OpenViewTitle };
