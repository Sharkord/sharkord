import type { TDesktopUnreadState } from '@sharkord/shared';
import { cn, Spinner, UnreadCount } from '@sharkord/ui';
import {
  CircleAlertIcon,
  CircleArrowUpIcon,
  LogInIcon,
  TriangleAlertIcon,
  UnplugIcon,
  type LucideIcon
} from 'lucide-react';
import { memo, type ReactNode } from 'react';
import type { TServerStatus } from '../shared/types';

const STATUS_ICONS: Partial<
  Record<TServerStatus, { icon: LucideIcon; className: string }>
> = {
  'signed-out': { icon: LogInIcon, className: 'text-muted-foreground' },
  disconnected: { icon: UnplugIcon, className: 'text-amber-500' },
  error: { icon: CircleAlertIcon, className: 'text-red-500' },
  'server-outdated': { icon: TriangleAlertIcon, className: 'text-amber-500' },
  'app-outdated': { icon: CircleArrowUpIcon, className: 'text-sky-500' }
};

const Badge = memo(({ children }: { children: ReactNode }) => (
  <span className="bg-sidebar ring-sidebar absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full ring-4">
    {children}
  </span>
));

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

    if (status === 'loading' || status === 'connecting') {
      return (
        <Badge>
          <Spinner size="xxs" className="size-3.5" />
        </Badge>
      );
    }

    const statusIcon = STATUS_ICONS[status];

    if (!statusIcon) {
      return null;
    }

    const { icon: Icon, className } = statusIcon;

    return (
      <Badge>
        <Icon className={cn('size-3.5', className)} />
      </Badge>
    );
  }
);

export { ServerStatusBadge };
