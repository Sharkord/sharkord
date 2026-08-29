import { getTRPCClient } from '@/lib/trpc';
import {
  getTrpcError,
  VOICE_REACTION_EMOJIS,
  type TVoiceReactionEmoji
} from '@sharkord/shared';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip
} from '@sharkord/ui';
import { Smile } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TReactionOptionProps = {
  emoji: TVoiceReactionEmoji;
  onSelect: (emoji: TVoiceReactionEmoji) => void;
};

const ReactionOption = memo(({ emoji, onSelect }: TReactionOptionProps) => {
  const handleClick = useCallback(() => onSelect(emoji), [onSelect, emoji]);

  return (
    <button
      type="button"
      className="size-8 flex items-center justify-center rounded text-xl transition-transform hover:scale-125"
      onClick={handleClick}
      aria-label={emoji}
    >
      {emoji}
    </button>
  );
});

ReactionOption.displayName = 'ReactionOption';

const ReactionsButton = memo(() => {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    async (emoji: TVoiceReactionEmoji) => {
      setOpen(false);

      try {
        await getTRPCClient().voice.sendReaction.mutate({ emoji });
      } catch (error) {
        toast.error(getTrpcError(error, t('failedSendVoiceReaction')));
      }
    },
    [t]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content={t('sendVoiceReaction')}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded size-8 transition-all duration-200 hover:bg-muted/60"
            aria-label={t('sendVoiceReaction')}
          >
            <Smile className="size-4" />
          </Button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent className="w-auto p-1.5" align="center" sideOffset={12}>
        <div className="flex items-center gap-0.5">
          {VOICE_REACTION_EMOJIS.map((emoji) => (
            <ReactionOption key={emoji} emoji={emoji} onSelect={handleSelect} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});

ReactionsButton.displayName = 'ReactionsButton';

export { ReactionsButton };
