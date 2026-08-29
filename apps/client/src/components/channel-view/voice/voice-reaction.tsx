import type { TVoiceReaction } from '@/features/server/types';
import { useVoiceReactions } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { VOICE_REACTION_DURATION_MS } from '@sharkord/shared';
import { memo, useMemo, type CSSProperties } from 'react';

type TVoiceReactionItemProps = {
  reaction: TVoiceReaction;
  isCompact?: boolean;
};

const VoiceReactionItem = memo(
  ({ reaction, isCompact }: TVoiceReactionItemProps) => {
    const style = useMemo(
      () =>
        ({
          '--vr-duration': `${VOICE_REACTION_DURATION_MS}ms`,
          '--vr-drift': `${reaction.drift}px`,
          '--vr-rotation': `${reaction.rotation}deg`,
          '--vr-scale': reaction.scale
        }) as CSSProperties,
      [reaction.drift, reaction.rotation, reaction.scale]
    );

    return (
      <span
        className="voice-reaction col-start-1 row-start-1"
        style={style}
        aria-hidden="true"
      >
        <span
          className={cn(
            'voice-reaction-emoji block leading-none drop-shadow-lg',
            isCompact ? 'text-2xl' : 'text-5xl'
          )}
        >
          {reaction.emoji}
        </span>
      </span>
    );
  }
);

VoiceReactionItem.displayName = 'VoiceReactionItem';

type TVoiceReactionProps = {
  userId: number;
  isCompact?: boolean;
};

const VoiceReaction = memo(({ userId, isCompact }: TVoiceReactionProps) => {
  const reactions = useVoiceReactions(userId);

  if (!reactions.length) return null;

  return (
    <div
      className={cn(
        'absolute inset-x-0 z-20 grid place-items-center pointer-events-none',
        isCompact ? 'bottom-3' : 'bottom-8'
      )}
    >
      {reactions.map((reaction) => (
        <VoiceReactionItem
          key={reaction.id}
          reaction={reaction}
          isCompact={isCompact}
        />
      ))}
    </div>
  );
});

VoiceReaction.displayName = 'VoiceReaction';

export { VoiceReaction };
