import { Emoji } from '@/components/emoji';
import { useOwnUserId } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  getTrpcError,
  type TFile,
  type TJoinedMessageReaction
} from '@sharkord/shared';
import { Button, Tooltip } from '@sharkord/ui';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useReactorNames } from './hooks/use-reactor-names';

type TTooltipPreviewProps = {
  emojiName: string;
  emojiSlot: React.ReactNode;
  reacters: string;
};

const TooltipPreview = memo(
  ({ emojiName, emojiSlot, reacters }: TTooltipPreviewProps) => {
    const { t } = useTranslation('common');

    return (
      <div className="flex items-center gap-2 max-w-xs wrap-break-word whitespace-pre-wrap text-sm">
        <div className="flex items-center flex-col">
          {emojiSlot}
          <span className="text-[8px]">:{emojiName}:</span>
        </div>
        <span className="text-xs">{t('wasReactedBy', { reacters })}</span>
      </div>
    );
  }
);

type TReactionProps = {
  emoji: string;
  count: number;
  isUserReacted: boolean;
  onSelect: (emoji: string) => void;
  file: TFile | null;
  userIds: number[];
  pluginIds: string[];
};

const Reaction = memo(
  ({
    emoji,
    count,
    isUserReacted,
    onSelect,
    file,
    userIds,
    pluginIds
  }: TReactionProps) => {
    const handleClick = useCallback(() => onSelect(emoji), [onSelect, emoji]);
    const tooltipContent = useReactorNames(userIds, pluginIds);

    return (
      <Tooltip
        content={
          <TooltipPreview
            emojiName={emoji}
            reacters={tooltipContent}
            emojiSlot={
              <Emoji
                emoji={emoji}
                file={file}
                className="w-10 h-10"
                nativeEmojiClassName="text-[28px]"
              />
            }
          />
        }
      >
        <Button
          size="sm"
          variant="outline"
          onClick={handleClick}
          className={cn(
            'flex items-center gap-1 h-9',
            isUserReacted ? 'border-border' : 'border-none'
          )}
        >
          <Emoji emoji={emoji} file={file} />
          <span className="font-medium">{count}</span>
        </Button>
      </Tooltip>
    );
  }
);

type TMessageReactionsProps = {
  messageId: number;
  reactions: TJoinedMessageReaction[];
};

type TAggregatedReaction = {
  emoji: string;
  count: number;
  userIds: number[];
  pluginIds: string[];
  isUserReacted: boolean;
  createdAt: number;
  file: TFile | null;
};

const MessageReactions = memo(
  ({ messageId, reactions }: TMessageReactionsProps) => {
    const { t } = useTranslation();
    const ownUserId = useOwnUserId();

    const handleReactionClick = useCallback(
      async (emoji: string) => {
        if (!ownUserId) return;

        const trpc = getTRPCClient();

        try {
          await trpc.messages.toggleReaction.mutate({
            messageId,
            emoji
          });
        } catch (error) {
          toast.error(getTrpcError(error, t('failedToggleReaction')));
        }
      },
      [messageId, ownUserId, t]
    );

    const aggregatedReactions = useMemo((): TAggregatedReaction[] => {
      const reactionMap = new Map<string, TAggregatedReaction>();

      reactions.forEach((reaction) => {
        if (!reactionMap.has(reaction.emoji)) {
          reactionMap.set(reaction.emoji, {
            emoji: reaction.emoji,
            count: 0,
            userIds: [],
            pluginIds: [],
            isUserReacted: false,
            createdAt: reaction.createdAt,
            file: reaction.file
          });
        }

        const aggregated = reactionMap.get(reaction.emoji)!;

        aggregated.count++;

        if (reaction.pluginId) {
          aggregated.pluginIds.push(reaction.pluginId);
        } else if (reaction.userId !== null) {
          aggregated.userIds.push(reaction.userId);
        }

        if (ownUserId && reaction.userId === ownUserId) {
          aggregated.isUserReacted = true;
        }
      });

      // sort by first reaction createdAt desc
      return Array.from(reactionMap.values()).sort(
        (a, b) => b.createdAt - a.createdAt
      );
    }, [reactions, ownUserId]);

    if (!aggregatedReactions.length) return null;

    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {aggregatedReactions.map((reaction) => (
          <Reaction
            key={reaction.emoji}
            emoji={reaction.emoji}
            count={reaction.count}
            userIds={reaction.userIds}
            pluginIds={reaction.pluginIds}
            isUserReacted={reaction.isUserReacted}
            onSelect={handleReactionClick}
            file={reaction.file}
          />
        ))}
      </div>
    );
  }
);

export { MessageReactions };
