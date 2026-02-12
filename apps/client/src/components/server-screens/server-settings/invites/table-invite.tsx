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
import { useLocaleFormat } from '@/hooks/use-locale-format';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { TInvite } from '@sharkord/shared';
import { format, formatDistanceToNow } from 'date-fns';
import { Copy, MoreVertical, Trash2 } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TTableInviteProps = {
  invite: TInvite;
  refetch: () => void;
};

const TableInvite = memo(({ invite, refetch }: TTableInviteProps) => {
  const { t } = useTranslation();
  const { dateFnsLocale } = useLocaleFormat();

  const isExpired = invite.expiresAt && invite.expiresAt < Date.now();
  const isMaxUsesReached = invite.maxUses && invite.uses >= invite.maxUses;

  const handleCopyCode = useCallback(() => {
    const inviteUrl = `${getUrlFromServer()}/?invite=${invite.code}`;

    navigator.clipboard.writeText(inviteUrl);
    toast.success(t('serverSettings.invites.toasts.copied'));
  }, [invite.code, t]);

  const handleDelete = useCallback(async () => {
    const answer = await requestConfirmation({
      title: t('serverSettings.invites.deleteTitle'),
      message: t('serverSettings.invites.deleteMessage'),
      confirmLabel: t('serverSettings.invites.deleteConfirm')
    });

    if (!answer) return;

    const trpc = getTRPCClient();

    try {
      await trpc.invites.delete.mutate({ inviteId: invite.id });
      toast.success(t('serverSettings.invites.toasts.deleted'));
      refetch();
    } catch (error) {
      toast.error(
        getTrpcError(error, t('serverSettings.invites.toasts.deleteFailed'))
      );
    }
  }, [invite.id, refetch, t]);

  const usesText = useMemo(() => {
    if (!invite.maxUses) {
      return `${invite.uses} / ∞`;
    }
    return `${invite.uses} / ${invite.maxUses}`;
  }, [invite.uses, invite.maxUses]);

  const expiresText = useMemo(() => {
    if (!invite.expiresAt) {
      return t('serverSettings.invites.never');
    }
    if (isExpired) {
      return t('serverSettings.invites.expired');
    }
    return formatDistanceToNow(invite.expiresAt, {
      addSuffix: true,
      locale: dateFnsLocale
    });
  }, [dateFnsLocale, invite.expiresAt, isExpired, t]);

  const statusBadge = useMemo(() => {
    if (isExpired) {
      return (
        <Badge variant="destructive" className="text-xs">
          {t('serverSettings.invites.expired')}
        </Badge>
      );
    }
    if (isMaxUsesReached) {
      return (
        <Badge variant="secondary" className="text-xs">
          {t('serverSettings.invites.maxUses')}
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="text-xs">
        {t('serverSettings.invites.active')}
      </Badge>
    );
  }, [isExpired, isMaxUsesReached, t]);

  return (
    <div
      key={invite.id}
      className="grid grid-cols-[180px_60px_80px_100px_140px_80px_80px] gap-4 px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
    >
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

      <div className="flex items-center gap-2 min-w-0">
        <UserAvatar userId={1} showUserPopover />
      </div>

      <div className="flex items-center text-muted-foreground">
        <span className="text-xs">{usesText}</span>
      </div>

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

      <div className="flex items-center text-muted-foreground">
        <span className="text-xs" title={format(invite.createdAt, 'PPP p')}>
          {formatDistanceToNow(invite.createdAt, {
            addSuffix: true,
            locale: dateFnsLocale
          })}
        </span>
      </div>

      <div className="flex items-center">{statusBadge}</div>

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
              {t('serverSettings.invites.copyInviteLink')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {t('serverSettings.invites.deleteConfirm')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export { TableInvite };
