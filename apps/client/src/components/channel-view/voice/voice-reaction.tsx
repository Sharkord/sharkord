import { useVoiceReaction } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { VOICE_REACTION_DURATION_MS } from '@sharkord/shared';
import { memo } from 'react';

const REACTION_STYLE = {
  animationDuration: `${VOICE_REACTION_DURATION_MS}ms`
};

type TVoiceReactionProps = {
  userId: number;
  isCompact?: boolean;
};

const VoiceReaction = memo(({ userId, isCompact }: TVoiceReactionProps) => {
  const reaction = useVoiceReaction(userId);

  if (!reaction) return null;

  return (
    <div className="absolute inset-x-0 bottom-8 z-20 flex justify-center pointer-events-none">
      <span
        key={reaction.id}
        className={cn(
          'voice-reaction drop-shadow-lg leading-none',
          isCompact ? 'text-2xl' : 'text-5xl'
        )}
        style={REACTION_STYLE}
      >
        {reaction.emoji}
      </span>
    </div>
  );
});

VoiceReaction.displayName = 'VoiceReaction';

export { VoiceReaction };
