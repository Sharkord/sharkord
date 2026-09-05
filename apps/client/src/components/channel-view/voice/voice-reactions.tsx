import { Emoji } from '@/components/emoji';
import { useCustomEmojiFile } from '@/features/server/emojis/hooks';
import { useVoiceReactions } from '@/features/server/voice/hooks';
import { VOICE_REACTION_DURATION_MS } from '@/features/server/voice/statics';
import { cn } from '@/lib/utils';
import { memo, useRef, type CSSProperties } from 'react';

const signedRandom = (min: number, max: number) =>
  (min + Math.random() * (max - min)) * (Math.random() < 0.5 ? -1 : 1);

const createAnimationStyle = () =>
  ({
    '--vr-duration': `${VOICE_REACTION_DURATION_MS}ms`,
    '--vr-drift': `${signedRandom(12, 46)}px`,
    '--vr-rotation': `${signedRandom(5, 14)}deg`,
    '--vr-scale': 0.85 + Math.random() * 0.3
  }) as CSSProperties;

type TVoiceReactionItemProps = {
  emoji: string;
  isCompact?: boolean;
};

const VoiceReactionItem = memo(
  ({ emoji, isCompact }: TVoiceReactionItemProps) => {
    const styleRef = useRef<CSSProperties | null>(null);
    const customEmojiFile = useCustomEmojiFile(emoji);

    if (!styleRef.current) styleRef.current = createAnimationStyle();

    return (
      <span
        className="voice-reaction col-start-1 row-start-1"
        style={styleRef.current}
        aria-hidden="true"
      >
        <span className="voice-reaction-emoji block leading-none drop-shadow-lg">
          <Emoji
            emoji={emoji}
            file={customEmojiFile}
            className={isCompact ? 'size-6' : 'size-12'}
            nativeEmojiClassName={isCompact ? 'text-2xl' : 'text-5xl'}
          />
        </span>
      </span>
    );
  }
);

VoiceReactionItem.displayName = 'VoiceReactionItem';

type TVoiceReactionsProps = {
  userId: number;
  isCompact?: boolean;
};

const VoiceReactions = memo(({ userId, isCompact }: TVoiceReactionsProps) => {
  const reactions = useVoiceReactions(userId);

  if (!reactions.length) return null;

  return (
    <div
      className={cn(
        'absolute inset-x-0 z-20 grid place-items-center pointer-events-none',
        isCompact ? 'bottom-3' : 'bottom-8'
      )}
    >
      {reactions.map(({ id, emoji }) => (
        <VoiceReactionItem key={id} emoji={emoji} isCompact={isCompact} />
      ))}
    </div>
  );
});

VoiceReactions.displayName = 'VoiceReactions';

export { VoiceReactions };
