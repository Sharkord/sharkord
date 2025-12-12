import { UserAvatar } from '@/components/user-avatar';
import type { TVoiceUser } from '@/features/server/types';
import { cn } from '@/lib/utils';
import { HeadphoneOff, MicOff, Monitor, Video } from 'lucide-react';
import { memo, useCallback } from 'react';
import { CardControls } from './card-controls';
import { CardGradient } from './card-gradient';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { PinButton } from './pin-button';

type TVoiceUserCardProps = {
  userId: number;
  onPin: () => void;
  onUnpin: () => void;
  showPinControls?: boolean;
  voiceUser: TVoiceUser;
  className?: string;
  isPinned?: boolean;
};

const VoiceUserCard = memo(
  ({
    userId,
    onPin,
    onUnpin,
    className,
    isPinned = false,
    showPinControls = true,
    voiceUser
  }: TVoiceUserCardProps) => {
    const { videoRef, hasVideoStream, isSpeaking, speakingIntensity } =
      useVoiceRefs(userId);

    const handlePinToggle = useCallback(() => {
      if (isPinned) {
        onUnpin?.();
      } else {
        onPin?.();
      }
    }, [isPinned, onPin, onUnpin]);

    const isActivelySpeaking = !voiceUser.state.micMuted && isSpeaking;

    return (
      <div
        className={cn(
          'relative bg-card border rounded-lg overflow-hidden group',
          'flex items-center justify-center',
          'min-h-0 aspect-video',
          'border-border',
          isActivelySpeaking
            ? speakingIntensity === 1
              ? 'speaking-effect-low'
              : speakingIntensity === 2
                ? 'speaking-effect-medium'
                : 'speaking-effect-high'
            : '',
          className
        )}
      >
        <CardGradient />

        <CardControls>
          {showPinControls && (
            <PinButton isPinned={isPinned} handlePinToggle={handlePinToggle} />
          )}
        </CardControls>

        {hasVideoStream && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {!hasVideoStream && (
          <UserAvatar
            userId={userId}
            className="w-16 h-16 md:w-20 md:h-20 lg:w-48 lg:h-48"
            showStatusBadge={false}
          />
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-white font-medium text-sm truncate">
                {voiceUser.name}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {voiceUser.state.micMuted && (
                <MicOff className="h-4 w-4 text-red-500/80" />
              )}

              {voiceUser.state.soundMuted && (
                <HeadphoneOff className="h-4 w-4 text-red-500/80" />
              )}

              {voiceUser.state.webcamEnabled && (
                <Video className="h-4 w-4 text-blue-600/80" />
              )}

              {voiceUser.state.sharingScreen && (
                <Monitor className="h-4 w-4 text-purple-500/80" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

VoiceUserCard.displayName = 'VoiceUserCard';

export { VoiceUserCard };
