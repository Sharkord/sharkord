import { useVoiceStats } from '@/components/voice-provider/stats-context';
import { useVolumeControl } from '@/components/voice-provider/volume-control-context';
import { useWebRtcSimulcastEnabled } from '@/features/server/hooks';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { useStreamQualityData } from '@/hooks/use-stream-quality-data';
import { cn } from '@/lib/utils';
import { StreamKind } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { Monitor, ZoomIn, ZoomOut } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { CardTheme } from './card-theme';
import { FullscreenButton } from './fullscreen-button';
import { cardControlClass, cardDensity } from './helpers';
import { useFullscreen } from './hooks/use-fullscreen';
import {
  PinnedCardType,
  type TPinnedCard
} from './hooks/use-pin-card-controller';
import { useScreenShareZoom } from './hooks/use-screen-share-zoom';
import { useVideoStats } from './hooks/use-video-stats';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { PictureInPictureButton } from './picture-in-picture-button';
import { PinButton } from './pin-button';
import { QualityButton } from './quality-button';
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

    const { getConsumerCodec } = useVoice();
    const transportStats = useVoiceStats();

    const videoStats = useVideoStats(screenShareRef, hasScreenShareStream);

    const codec = useMemo(() => {
      let mimeType: string | undefined;

      if (isOwnUser) {
        mimeType = transportStats.screenShare?.codec;
      } else {
        mimeType = getConsumerCodec(userId, StreamKind.SCREEN);
      }

      if (!mimeType) return null;

      const parts = mimeType.split('/');

      return parts.length > 1 ? parts[1] : mimeType;
    }, [
      isOwnUser,
      transportStats.screenShare?.codec,
      getConsumerCodec,
      userId
    ]);

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

    if (!user || !hasScreenShareStream) return null;

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
        onMouseLeave={handleMouseUp}
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

        <audio
          ref={screenShareAudioRef}
          className="hidden"
          autoPlay
          playsInline
        />

        <div
          className={cn(
            'absolute top-0 right-0 z-10 min-h-4 items-center',
            density.inset,
            density.controls,
            'hidden group-hover/screen-share-card:inline-flex',
            'has-[[data-state=open]]:inline-flex'
          )}
        >
          <PictureInPictureButton
            videoRef={screenShareRef}
            size={density.icon}
            className={cardControlClass(isCompact)}
          />
          {!isOwnUser && hasScreenShareAudioStream && (
            <VolumeButton
              volumeKey={volumeKey}
              size={density.icon}
              className={cardControlClass(isCompact)}
            />
          )}
          {!isOwnUser && webRtcSimulcastEnabled && (
            <QualityButton
              streamId={userId}
              kind={StreamKind.SCREEN}
              disabled={!isSimulcastScreenConsumer}
              size={density.icon}
              className={cardControlClass(isCompact)}
            />
          )}
          <FullscreenButton
            isFullscreen={isFullscreen}
            handleToggleFullscreen={handleToggleFullscreen}
            size={density.icon}
            className={cardControlClass(isCompact, isFullscreen)}
          />
          {showPinControls && isPinned && (
            <IconButton
              variant={isZoomEnabled ? 'default' : 'ghost'}
              icon={isZoomEnabled ? ZoomOut : ZoomIn}
              onClick={handleToggleZoom}
              title={isZoomEnabled ? 'Disable Zoom' : 'Enable Zoom'}
              size={density.icon}
              className={cardControlClass(isCompact, isZoomEnabled)}
            />
          )}
          {showPinControls && (
            <PinButton
              isPinned={isPinned}
              handlePinToggle={handlePinToggle}
              size={density.icon}
              className={cardControlClass(isCompact, isPinned)}
            />
          )}
        </div>

        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 flex',
            density.inset,
            'hidden group-hover/screen-share-card:flex'
          )}
        >
          <div
            className={cn(
              'inline-flex min-w-0 min-h-4 py-2 items-center bg-black/70 rounded overflow-hidden truncate',
              density.badge
            )}
          >
            <Monitor className="text-white shrink-0 size-3" />
            <p className={cn('leading-none truncate', density.label)}>
              {user.name}'s screen
              {(videoStats || codec) && (
                <span className="text-muted-foreground text-xs ml-2 leading-none">
                  {codec}
                  {codec && videoStats && ' '}
                  {videoStats && (
                    <>
                      {videoStats.width}x{videoStats.height}
                      {videoStats.frameRate > 0 &&
                        ` ${videoStats.frameRate}fps`}
                    </>
                  )}
                  {(codec || videoStats) && qualityLabel && ' '}
                  {qualityLabel && `(${qualityLabel})`}
                </span>
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
