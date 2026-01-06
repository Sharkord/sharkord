import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { useCan } from '@/features/server/hooks';
import { useOwnUserId, useUsernames } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  Permission,
  type TFile,
  type TJoinedMessageReaction
} from '@sharkord/shared';
import { gitHubEmojis } from '@tiptap/extension-emoji';
import { memo, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

type TMessageReactionsProps = {
  messageId: number;
  reactions: TJoinedMessageReaction[];
};

type TAggregatedReaction = {
  emoji: string;
  count: number;
  userIds: number[];
  isUserReacted: boolean;
  createdAt: number;
  file: TFile | null;
};

const MessageReactions = memo(
  ({ messageId, reactions }: TMessageReactionsProps) => {
    const ownUserId = useOwnUserId();
    const can = useCan();
    const usernames = useUsernames();

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
          toast.error(getTrpcError(error, 'Failed to toggle reaction'));
        }
      },
      [messageId, ownUserId]
    );

    const renderEmoji = useCallback(
      (emojiName: string, file: TFile | null): React.ReactNode => {
        const gitHubEmoji = gitHubEmojis.find((e) => e.name === emojiName);

        if (gitHubEmoji?.emoji) {
          return <span className="text-sm">{gitHubEmoji.emoji}</span>;
        }

        return (
          <img
            src={getFileUrl(file)}
            alt={`:${emojiName}:`}
            className="w-4 h-4 object-contain"
            onError={(e) => {
              // Fallback to text if image fails to load
              const target = e.target as HTMLImageElement;

              target.outerHTML = `<span class="text-xs text-muted-foreground">:${emojiName}:</span>`;
            }}
          />
        );
      },
      []
    );

    const aggregatedReactions = useMemo((): TAggregatedReaction[] => {
      const reactionMap = new Map<string, TAggregatedReaction>();

      reactions.forEach((reaction) => {
        if (!reactionMap.has(reaction.emoji)) {
          reactionMap.set(reaction.emoji, {
            emoji: reaction.emoji,
            count: 0,
            userIds: [],
            isUserReacted: false,
            createdAt: reaction.createdAt,
            file: reaction.file
          });
        }

        const aggregated = reactionMap.get(reaction.emoji)!;

        aggregated.count++;
        aggregated.userIds.push(reaction.userId);

        if (ownUserId && reaction.userId === ownUserId) {
          aggregated.isUserReacted = true;
        }
      });

      // sort by first reaction createdAt desc
      return Array.from(reactionMap.values()).sort(
        (a, b) => b.createdAt + a.createdAt
      );
    }, [reactions, ownUserId]);

    if (!aggregatedReactions.length) return null;

    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {aggregatedReactions.map((reaction) => {
          const tooltipContent = reaction.userIds
            .map((userId) => usernames[userId] || 'Unknown')
            .join(', ');

          return (
            <Tooltip
              content={tooltipContent}
              key={`reaction-${reaction.emoji}`}
            >
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReactionClick(reaction.emoji)}
                disabled={!can(Permission.REACT_TO_MESSAGES)}
                className={cn(
                  'flex items-center gap-1',
                  reaction.isUserReacted ? 'border-border' : 'border-none'
                )}
              >
                {renderEmoji(reaction.emoji, reaction.file)}
                <span className="font-medium">{reaction.count}</span>
              </Button>
            </Tooltip>
          );
        })}
      </div>
    );
  }
);

export { MessageReactions };
