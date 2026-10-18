import type { TDesktopUnreadState } from '@sharkord/shared';
import { cn, Spinner, UnreadCount } from '@sharkord/ui';
import {
  CircleAlertIcon,
  LogInIcon,
  UnplugIcon,
  type LucideIcon
} from 'lucide-react';
import { memo } from 'react';
import type { TServerStatus } from '../shared/types';

const BADGE_CLASS =
  'bg-sidebar ring-sidebar absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full ring-4';

const STATUS_ICONS: Partial<
  Record<TServerStatus, { icon: LucideIcon; className: string }>
> = {
  'signed-out': { icon: LogInIcon, className: 'text-muted-foreground' },
  disconnected: { icon: UnplugIcon, className: 'text-amber-500' },
  error: { icon: CircleAlertIcon, className: 'text-red-500' }
};

type TServerStatusBadgeProps = {
  status: TServerStatus;
  unread: TDesktopUnreadState | undefined;
};

const ServerStatusBadge = memo(
  ({ status, unread }: TServerStatusBadgeProps) => {
    if (status === 'connected') {
      if (!unread) {
        return null;
      }

      return (
        <UnreadCount
          count={unread.count}
          hasMention={unread.mentioned}
          className="ring-sidebar absolute -right-1 -bottom-1 ring-4"
        />
      );
    }

    if (status === 'connecting') {
      return (
        <span className={BADGE_CLASS}>
          <Spinner size="xxs" className="size-3.5" />
        </span>
      );
    }

    const statusIcon = STATUS_ICONS[status];

    if (!statusIcon) {
      return null;
    }

    const { icon: Icon, className } = statusIcon;

    return (
      <span className={BADGE_CLASS}>
        <Icon className={cn('size-3.5', className)} />
      </span>
    );
  }
);

export { ServerStatusBadge };
