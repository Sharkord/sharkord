import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { UserAvatar } from '@/components/user-avatar';
import { useStreamVolumeControl } from '@/components/voice-provider/hooks/use-stream-volume-control';
import type { TVoiceUser } from '@/features/server/types';
import { useIsOwnUser } from '@/features/server/users/hooks';
import {
  useShowUserBannersInVoice,
  useSpeakingState
} from '@/features/server/voice/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
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
    const { videoRef, hasVideoStream } = useVoiceRefs(userId);
    const { volumeKey } = useStreamVolumeControl({ type: 'user', userId });
    const { devices } = useDevices();
    const isOwnUser = useIsOwnUser(userId);
    const showUserBanners = useShowUserBannersInVoice();
    const { isActivelySpeaking, speakingEffectClass } =
      useSpeakingState(userId);

    const handlePinToggle = useCallback(() => {
      if (isPinned) {
        onUnpin?.();
      } else {
        onPin?.();
      }
    }, [isPinned, onPin, onUnpin]);

    return (
      <div
        className={cn(
          'relative bg-card rounded-lg overflow-hidden group',
          'flex items-center justify-center',
          'w-full h-full',
          'border border-border',
          isActivelySpeaking && speakingEffectClass,
          className
        )}
      >
        {voiceUser.banner && showUserBanners ? (
          <div
            className="h-full w-full rounded-t-md bg-cover bg-center blur-sm brightness-50 bg-no-repeat absolute inset-0"
            style={{
              backgroundImage: `url("${getFileUrl(voiceUser.banner)}")`
            }}
          />
        ) : (
          <CardGradient />
        )}

        <CardControls>
          {!isOwnUser && <VolumeButton volumeKey={volumeKey} />}
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
