import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { UserAvatar } from '@/components/user-avatar';
import { useVolumeControl } from '@/components/voice-provider/volume-control-context';
import type { TVoiceUser } from '@/features/server/types';
import { useOwnUserId } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import { HeadphoneOff, MicOff, Monitor, Video } from 'lucide-react';
import { memo, useCallback } from 'react';
import { CardControls } from './card-controls';
import { CardGradient } from './card-gradient';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { PinButton } from './pin-button';
import { VolumeButton } from './volume-button';

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
    const { getUserVolumeKey } = useVolumeControl();
    const { devices } = useDevices();
    const ownUserId = useOwnUserId();
    const isOwnUser = userId === ownUserId;

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
          'relative bg-card rounded-lg overflow-hidden group',
          'flex items-center justify-center',
          'w-full h-full',
          'border border-border',
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
          {!isOwnUser && <VolumeButton volumeKey={getUserVolumeKey(userId)} />}
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
            className={cn(
              'absolute inset-0 w-full h-full object-contain',
              isOwnUser && devices.mirrorOwnVideo && '-scale-x-100'
            )}
          />
        )}
        {!hasVideoStream && (
          <UserAvatar
            userId={userId}
            className="w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24"
            showStatusBadge={false}
          />
        )}

        <div className="absolute bottom-0 left-0 right-0 p-2">
          <div className="flex items-center justify-between">
            <span className="text-white font-medium text-xs truncate">
              {voiceUser.name}
            </span>

            <div className="flex items-center gap-1">
              {voiceUser.state.micMuted && (
                <MicOff className="size-3.5 text-red-500/80" />
              )}

              {voiceUser.state.soundMuted && (
                <HeadphoneOff className="size-3.5 text-red-500/80" />
              )}

              {voiceUser.state.webcamEnabled && (
                <Video className="size-3.5 text-blue-600/80" />
              )}

              {voiceUser.state.sharingScreen && (
                <Monitor className="size-3.5 text-purple-500/80" />
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
