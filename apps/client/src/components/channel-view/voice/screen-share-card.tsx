import { useVolumeControl } from '@/components/voice-provider/volume-control-context';
import { useWebRtcSimulcastEnabled } from '@/features/server/hooks';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { useIsHovered } from '@/hooks/use-is-hovered';
import { useStreamQualityData } from '@/hooks/use-stream-quality-data';
import { cn } from '@/lib/utils';
import { StreamKind } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { Monitor, ZoomIn, ZoomOut } from 'lucide-react';
import { memo, useCallback } from 'react';
import { CardTheme } from './card-theme';
import { FullscreenButton } from './fullscreen-button';
import {
  cardBadgeClass,
  cardControlClass,
  cardControlsClass,
  cardDensity
} from './helpers';
import { useFullscreen } from './hooks/use-fullscreen';
import {
  PinnedCardType,
  type TPinnedCard
} from './hooks/use-pin-card-controller';
import { useScreenShareZoom } from './hooks/use-screen-share-zoom';
import { useStreamVisibility } from './hooks/use-stream-visibility';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { OwnScreenShareInfo } from './own-screen-share-info';
import { PauseButton } from './pause-button';
import { PausedStreamOverlay } from './paused-stream-overlay';
import { PictureInPictureButton } from './picture-in-picture-button';
import { PinButton } from './pin-button';
import { QualityButton } from './quality-button';
import { StreamInfo } from './stream-info';
import { UnplayableStreamOverlay } from './unplayable-stream-overlay';
import { VolumeButton } from './volume-button';

type TScreenShareCardProps = {
  userId: number;
  isPinned?: boolean;
  cardId: string;
  onPin: (card: TPinnedCard) => void;
  onUnpin: () => void;
  className?: string;
  showPinControls: boolean;
  isAnyCardPinned?: boolean;
};

const ScreenShareCard = memo(
  ({
    userId,
    isPinned = false,
    cardId,
    onPin,
    onUnpin,
    className,
    showPinControls = true,
    isAnyCardPinned = false
  }: TScreenShareCardProps) => {
    const user = useUserById(userId);
    const ownUserId = useOwnUserId();
    const { getUserScreenVolumeKey } = useVolumeControl();
    const isOwnUser = ownUserId === userId;
    const webRtcSimulcastEnabled = useWebRtcSimulcastEnabled();
    const volumeKey = getUserScreenVolumeKey(userId);

    const isCompact = isAnyCardPinned && !isPinned;
    const density = cardDensity(isCompact);

    const {
      screenShareRef,
      screenShareAudioRef,
      hasScreenShareStream,
      hasScreenShareAudioStream
    } = useVoiceRefs(userId);

    const { getConsumerCodec, isStreamUnplayable } = useVoice();
    const isUnplayable =
      !isOwnUser && isStreamUnplayable(userId, StreamKind.SCREEN);
    const { isHovered, onMouseEnter, onMouseLeave } = useIsHovered();

    useStreamVisibility(
      screenShareRef,
      userId,
      StreamKind.SCREEN,
      hasScreenShareStream && !isOwnUser
    );

    const { isSimulcastScreenConsumer, qualityLabel } = useStreamQualityData(
      userId,
      StreamKind.SCREEN
    );

    const {
      containerRef,
      isZoomEnabled,
      zoom,
      position,
      isDragging,
      handleToggleZoom,
      handleWheel,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      getCursor,
      resetZoom
    } = useScreenShareZoom();

    const {
      isFullscreen,
      fullscreenElement,
      isOverlayVisible,
      toggleFullscreen,
      handleDoubleClick
    } = useFullscreen(containerRef);

    const handleToggleFullscreen = useCallback(() => {
      resetZoom();
      toggleFullscreen();
    }, [resetZoom, toggleFullscreen]);

    const handlePinToggle = useCallback(() => {
      if (isPinned) {
        onUnpin?.();
        resetZoom();
      } else {
        onPin({
          id: cardId,
          type: PinnedCardType.SCREEN_SHARE,
          userId: userId
        });
      }
    }, [isPinned, onPin, onUnpin, cardId, userId, resetZoom]);

    const handleMouseLeave = useCallback(() => {
      handleMouseUp();
      onMouseLeave();
    }, [handleMouseUp, onMouseLeave]);

    if (!user || (!hasScreenShareStream && !isUnplayable)) return null;

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative bg-black group/screen-share-card',
          'flex items-center justify-center',
          'size-full',
          isFullscreen
            ? 'rounded-none border-none'
            : 'rounded overflow-hidden border border-border',
          className
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseEnter={onMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: isFullscreen && !isOverlayVisible ? 'none' : getCursor()
        }}
      >
        <CardTheme />

        <video
          ref={screenShareRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-contain bg-black"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        />

        {!isOwnUser && (
          <PausedStreamOverlay streamId={userId} kind={StreamKind.SCREEN} />
        )}

        {isUnplayable && <UnplayableStreamOverlay title={user.name} />}

        <audio
          ref={screenShareAudioRef}
          className="hidden"
          autoPlay
          playsInline
        />

        <div
          className={cn(
            'absolute top-0 right-0 z-10 justify-end',
            density.inset,
            'hidden group-hover/screen-share-card:flex',
            'has-[[data-state=open]]:flex'
          )}
        >
          <div className={cardControlsClass(isCompact)}>
            <PictureInPictureButton
              videoRef={screenShareRef}
              size={density.icon}
              className={cardControlClass()}
            />
            {!isOwnUser && (
              <PauseButton
                streamId={userId}
                kind={StreamKind.SCREEN}
                size={density.icon}
                className={cardControlClass()}
              />
            )}
            {!isOwnUser && hasScreenShareAudioStream && (
              <VolumeButton
                volumeKey={volumeKey}
                size={density.icon}
                className={cardControlClass()}
                portalContainer={fullscreenElement}
              />
            )}
            {!isOwnUser && webRtcSimulcastEnabled && (
              <QualityButton
                streamId={userId}
                kind={StreamKind.SCREEN}
                disabled={!isSimulcastScreenConsumer}
                size={density.icon}
                className={cardControlClass()}
                portalContainer={fullscreenElement}
              />
            )}
            <FullscreenButton
              isFullscreen={isFullscreen}
              handleToggleFullscreen={handleToggleFullscreen}
              size={density.icon}
              className={cardControlClass(isFullscreen)}
            />
            {showPinControls && isPinned && (
              <IconButton
                variant={isZoomEnabled ? 'default' : 'ghost'}
                icon={isZoomEnabled ? ZoomOut : ZoomIn}
                onClick={handleToggleZoom}
                title={isZoomEnabled ? 'Disable Zoom' : 'Enable Zoom'}
                size={density.icon}
                className={cardControlClass(isZoomEnabled)}
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
          className={cn(
            'absolute bottom-0 left-0 right-0',
            density.inset,
            'hidden group-hover/screen-share-card:flex'
          )}
        >
          <div className={cardBadgeClass(isCompact)}>
            <Monitor className="text-white shrink-0 size-3" />
            <p className={cn('leading-none truncate', density.label)}>
              {user.name}'s screen
              {isHovered && isOwnUser && (
                <OwnScreenShareInfo
                  videoRef={screenShareRef}
                  qualityLabel={qualityLabel}
                />
              )}
              {isHovered && !isOwnUser && (
                <StreamInfo
                  videoRef={screenShareRef}
                  mimeType={getConsumerCodec(userId, StreamKind.SCREEN)}
                  qualityLabel={qualityLabel}
                />
              )}
              {isZoomEnabled && zoom > 1 && (
                <span className="text-white/70 text-xs ml-2 leading-none">
                  {Math.round(zoom * 100)}%
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

ScreenShareCard.displayName = 'ScreenShareCard';

export { ScreenShareCard };
