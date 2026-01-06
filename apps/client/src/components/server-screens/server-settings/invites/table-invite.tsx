import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/user-avatar';
import { requestConfirmation } from '@/features/dialogs/actions';
import { getUrlFromServer } from '@/helpers/get-file-url';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { TInvite } from '@sharkord/shared';
import { format, formatDistanceToNow } from 'date-fns';
import { Copy, MoreVertical, Trash2 } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

type TTableInviteProps = {
  invite: TInvite;
  refetch: () => void;
};

const TableInvite = memo(({ invite, refetch }: TTableInviteProps) => {
  const isExpired = invite.expiresAt && invite.expiresAt < Date.now();
  const isMaxUsesReached = invite.maxUses && invite.uses >= invite.maxUses;

  const handleCopyCode = useCallback(() => {
    const inviteUrl = `${getUrlFromServer()}/?invite=${invite.code}`;

    navigator.clipboard.writeText(inviteUrl);
    toast.success('Invite code copied to clipboard');
  }, [invite.code]);

  const handleDelete = useCallback(async () => {
    const answer = await requestConfirmation({
      title: 'Delete Invite',
      message:
        'Are you sure you want to delete this invite? This action cannot be undone.',
      confirmLabel: 'Delete'
    });

    if (!answer) return;

    const trpc = getTRPCClient();

    try {
      await trpc.invites.delete.mutate({ inviteId: invite.id });
      toast.success('Invite deleted');
      refetch();
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to delete invite'));
    }
  }, [invite.id, refetch]);

  const usesText = useMemo(() => {
    if (!invite.maxUses) {
      return `${invite.uses} / ∞`;
    }
    return `${invite.uses} / ${invite.maxUses}`;
  }, [invite.uses, invite.maxUses]);

  const expiresText = useMemo(() => {
    if (!invite.expiresAt) {
      return 'Never';
    }
    if (isExpired) {
      return 'Expired';
    }
    return formatDistanceToNow(invite.expiresAt, { addSuffix: true });
  }, [invite.expiresAt, isExpired]);

  const statusBadge = useMemo(() => {
    if (isExpired) {
      return (
        <Badge variant="destructive" className="text-xs">
          Expired
        </Badge>
      );
    }
    if (isMaxUsesReached) {
      return (
        <Badge variant="secondary" className="text-xs">
          Max Uses
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="text-xs">
        Active
      </Badge>
    );
  }, [isExpired, isMaxUsesReached]);

  return (
    <div
      key={invite.id}
      className="grid grid-cols-[180px_60px_80px_100px_140px_80px_80px] gap-4 px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
    >
      {/* Code */}
      <div className="flex items-center min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <code className="text-xs font-mono bg-muted px-2 py-1 rounded truncate">
            {invite.code}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleCopyCode}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Creator */}
      <div className="flex items-center gap-2 min-w-0">
        <UserAvatar userId={1} showUserPopover />
      </div>

      {/* Uses */}
      <div className="flex items-center text-muted-foreground">
        <span className="text-xs">{usesText}</span>
      </div>

      {/* Expires */}
      <div className="flex items-center text-muted-foreground">
        <span
          className={cn('text-xs', {
            'text-destructive': isExpired
          })}
          title={
            invite.expiresAt ? format(invite.expiresAt, 'PPP p') : undefined
          }
        >
          {expiresText}
        </span>
      </div>

      {/* Created */}
      <div className="flex items-center text-muted-foreground">
        <span className="text-xs" title={format(invite.createdAt, 'PPP p')}>
          {formatDistanceToNow(invite.createdAt, { addSuffix: true })}
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center">{statusBadge}</div>

      {/* Actions */}
      <div className="flex items-center justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopyCode}>
              <Copy className="h-4 w-4" />
              Copy Invite Link
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export { TableInvite };
