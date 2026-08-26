import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { UserAvatar } from '@/components/user-avatar';
import { useStreamVolumeControl } from '@/components/voice-provider/hooks/use-stream-volume-control';
import { useWebRtcSimulcastEnabled } from '@/features/server/hooks';
import type { TVoiceUser } from '@/features/server/types';
import { useIsOwnUser } from '@/features/server/users/hooks';
import {
  useShowUserBannersInVoice,
  useSpeakingState,
  useVoice
} from '@/features/server/voice/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { cn } from '@/lib/utils';
import { StreamKind } from '@sharkord/shared';
import { HeadphoneOff, MicOff, Monitor, Video } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { CardTheme } from './card-theme';
import {
  cardBadgeClass,
  cardControlClass,
  cardControlsClass,
  cardDensity
} from './helpers';
import {
  PinnedCardType,
  type TPinnedCard
} from './hooks/use-pin-card-controller';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { PictureInPictureButton } from './picture-in-picture-button';
import { PinButton } from './pin-button';
import { QualityButton } from './quality-button';
import { VolumeButton } from './volume-button';

type TVoiceUserCardProps = {
  userId: number;
  cardId: string;
  onPin: (card: TPinnedCard) => void;
  onUnpin: () => void;
  showPinControls?: boolean;
  voiceUser: TVoiceUser;
  className?: string;
  isPinned?: boolean;
  isAnyCardPinned?: boolean;
};

const VoiceUserCard = memo(
  ({
    userId,
    cardId,
    onPin,
    onUnpin,
    className,
    isPinned = false,
    showPinControls = true,
    voiceUser,
    isAnyCardPinned = false
  }: TVoiceUserCardProps) => {
    const { videoRef, hasVideoStream } = useVoiceRefs(userId);
    const { volumeKey } = useStreamVolumeControl({ type: 'user', userId });
    const { devices } = useDevices();
    const isOwnUser = useIsOwnUser(userId);
    const showUserBanners = useShowUserBannersInVoice();
    const webRtcSimulcastEnabled = useWebRtcSimulcastEnabled();
    const { isSimulcastConsumer } = useVoice();
    const { isActivelySpeaking, speakingEffectClass } =
      useSpeakingState(userId);

    const isCompact = isAnyCardPinned && !isPinned;
    const density = cardDensity(isCompact);
    const showQualityControl =
      !isOwnUser && webRtcSimulcastEnabled && hasVideoStream;

    const handlePinToggle = useCallback(() => {
      if (isPinned) {
        onUnpin?.();
      } else {
        onPin({ id: cardId, type: PinnedCardType.USER, userId: userId });
      }
    }, [isPinned, onPin, onUnpin, cardId, userId]);

    const backgroundStyle = useMemo(
      () =>
        hasVideoStream
          ? { backgroundColor: '#000000' }
          : { backgroundImage: `url("${getFileUrl(voiceUser.banner)}")` },
      [hasVideoStream, voiceUser.banner]
    );

    return (
      <div
        className={cn(
          'relative bg-card rounded overflow-hidden group/voice-user-card',
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
            style={backgroundStyle}
          />
        ) : (
          <CardTheme
            profileColor={voiceUser.profileColor}
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
                : isCompact
                  ? 'w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14'
                  : 'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24'
            )}
            showStatusBadge={false}
          />
        )}

        <div
          className={cn(
            'absolute top-0 right-0 z-10 justify-end',
            density.inset,
            'hidden group-hover/voice-user-card:flex',
            'has-[[data-state=open]]:flex'
          )}
        >
          <div className={cardControlsClass(isCompact)}>
            {!isOwnUser && (
              <VolumeButton
                volumeKey={volumeKey}
                size={density.icon}
                className={cardControlClass()}
              />
            )}
            {showQualityControl && (
              <QualityButton
                streamId={userId}
                kind={StreamKind.VIDEO}
                disabled={!isSimulcastConsumer(userId, StreamKind.VIDEO)}
                size={density.icon}
                className={cardControlClass()}
              />
            )}
            {hasVideoStream && (
              <PictureInPictureButton
                videoRef={videoRef}
                size={density.icon}
                className={cardControlClass()}
              />
            )}
            {showPinControls && (
              <PinButton
                isPinned={isPinned}
                handlePinToggle={handlePinToggle}
                size={density.icon}
                className={cardControlClass(isPinned)}
              />
            )}
          </div>
        </div>

        <div
          className={cn('absolute bottom-0 left-0 right-0 flex', density.inset)}
        >
          <div
            className={cn(
              cardBadgeClass(isCompact),
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
                'hidden group-hover/voice-stage:block truncate leading-none',
                density.label
              )}
            >
              {voiceUser.name}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

VoiceUserCard.displayName = 'VoiceUserCard';

export { VoiceUserCard };
