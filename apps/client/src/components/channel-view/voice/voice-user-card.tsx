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
  aCardIsPinned?: boolean;
};

const VoiceUserCard = memo(
  ({
    userId,
    onPin,
    onUnpin,
    className,
    isPinned = false,
    showPinControls = true,
    voiceUser,
    aCardIsPinned = false
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
          'relative bg-card rounded overflow-hidden group',
          'flex items-center justify-center',
          'size-full',
          'border border-border',
          isActivelySpeaking && speakingEffectClass,
          className
        )}
      >
        {voiceUser.banner && showUserBanners ? (
          <div
            className="h-full w-full rounded bg-center bg-cover blur-sm brightness-50 bg-no-repeat absolute inset-0"
            style={
              hasVideoStream
                ? { backgroundColor: '#000000' }
                : {
                    backgroundImage: `url("${getFileUrl(voiceUser.banner)}")`
                  }
            }
          />
        ) : (
          <CardGradient
            bannerColor={voiceUser.bannerColor}
            hasVideoStream={hasVideoStream}
          />
        )}

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
            className={cn(
              'pointer-events-none',
              isPinned
                ? 'w-16 h-16 md:w-20 md:h-20 lg:w-32 lg:h-32'
                : aCardIsPinned
                  ? 'w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14'
                  : 'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24'
            )}
            showStatusBadge={false}
          />
        )}

        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 flex justify-between',
            isPinned ? 'p-4 gap-3' : aCardIsPinned ? 'p-1 gap-1' : 'p-4 gap-3'
          )}
        >
          <div
            className={cn(
              'inline-flex min-w-0 min-h-4 py-2 items-center bg-black/70 rounded overflow-hidden truncate',
              isPinned
                ? 'gap-3 px-3'
                : aCardIsPinned
                  ? 'gap-2 px-2'
                  : 'gap-3 px-3',
              !voiceUser.state.micMuted &&
                !voiceUser.state.soundMuted &&
                !voiceUser.state.webcamEnabled &&
                !voiceUser.state.sharingScreen &&
                'hidden group-hover/voice-stage:inline-flex'
            )}
          >
            {voiceUser.state.micMuted && !voiceUser.state.soundMuted && (
              <MicOff
                className="text-red-400/80 shrink-0 size-3"
                fill="currentColor"
              />
            )}
            {voiceUser.state.soundMuted && (
              <HeadphoneOff
                className="text-red-400/80 size-3"
                fill="currentColor"
              />
            )}
            {voiceUser.state.webcamEnabled && (
              <Video className="text-white/80 size-3" fill="currentColor" />
            )}
            {voiceUser.state.sharingScreen && (
              <Monitor className="text-white/80 size-3" />
            )}
            <p
              className={cn(
                'hidden group-hover/voice-stage:block truncate',
                isPinned ? 'text-sm' : aCardIsPinned ? 'text-xs' : 'text-sm',
                'leading-none'
              )}
            >
              {voiceUser.name}
            </p>
          </div>

          <div
            className={cn(
              'inline-flex min-h-4 gap-3 items-center rounded',
              isPinned ? 'gap-2' : aCardIsPinned ? 'gap-1' : 'gap-2',
              'hidden group-hover:inline-flex'
            )}
          >
            {!isOwnUser && (
              <VolumeButton
                volumeKey={volumeKey}
                size={'xs'}
                className={cn(
                  'bg-black/70 rounded py-2 shrink-0 hover:bg-black/80',
                  isPinned ? 'px-3' : aCardIsPinned ? 'px-2' : 'px-3'
                )}
              />
            )}
            {showPinControls && (
              <PinButton
                isPinned={isPinned}
                handlePinToggle={handlePinToggle}
                size={'xs'}
                className={cn(
                  'bg-black/70 rounded py-2 shrink-0 hover:bg-black/80',
                  isPinned ? 'px-3' : aCardIsPinned ? 'px-2' : 'px-3',
                  isPinned &&
                    'bg-zinc-300/80 text-zinc-800 hover:bg-zinc-400/90 hover:text-zinc-900'
                )}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

VoiceUserCard.displayName = 'VoiceUserCard';

export { VoiceUserCard };
